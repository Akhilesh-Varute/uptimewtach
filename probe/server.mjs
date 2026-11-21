// UptimeWatch regional probe: a tiny dependency-free HTTP service you run in other regions (e.g. Fly.io).
// Before alerting, the main app asks each probe "can you reach this target?" so one region's
// network blip doesn't page anyone.  Run: PROBE_SECRET=... REGION=fra node probe/server.mjs
import http from "node:http";
import net from "node:net";
import dns from "node:dns/promises";

const SECRET = process.env.PROBE_SECRET;
const REGION = process.env.REGION || process.env.FLY_REGION || "unknown";
const PORT = Number(process.env.PORT || 8080);
const REACHABLE = [401, 403, 429]; // server answered but won't serve bots: counts as up (same rule as the main app)
if (!SECRET) throw new Error("PROBE_SECRET is required");

function isPrivate(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivate(mapped[1]) : v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6);
}

// Refuse private/internal targets so the probe can't be used to scan its own network.
// ponytail: checks DNS before connecting (not on redirects); the main app already guards inputs.
async function assertPublic(host) {
  const h = host.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.(localhost|local|internal))$/i.test(h)) throw new Error("Blocked: private or internal address");
  const addrs = net.isIP(h) ? [{ address: h }] : await dns.lookup(h, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) throw new Error("Blocked: private or internal address");
}

async function checkHttp(url, keyword) {
  const start = Date.now();
  await assertPublic(new URL(url).hostname);
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "UptimeWatch/1.0 Monitoring Bot" } });
  const up = res.status < 400 || REACHABLE.includes(res.status);
  if (up && keyword && !(await res.text()).includes(keyword)) {
    return { status: "down", status_code: res.status, error: `Keyword "${keyword}" not found`, ms: Date.now() - start };
  }
  return { status: up ? "up" : "down", status_code: res.status, error: up ? null : `HTTP ${res.status}`, ms: Date.now() - start };
}

async function checkTcp(host, port) {
  const start = Date.now();
  await assertPublic(host);
  return new Promise((resolve) => {
    const sock = net.connect({ host, port, timeout: 10_000 });
    const done = (r) => { sock.destroy(); resolve({ ...r, ms: Date.now() - start }); };
    sock.on("connect", () => done({ status: "up", error: null }));
    sock.on("timeout", () => done({ status: "down", error: "timeout" }));
    sock.on("error", (e) => done({ status: "down", error: e.message }));
  });
}

http.createServer(async (req, res) => {
  const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.method === "GET" && req.url === "/health") return send(200, { ok: true, region: REGION });
  if (req.method !== "POST" || req.url !== "/probe") return send(404, { error: "not found" });
  if (req.headers["x-probe-secret"] !== SECRET) return send(401, { error: "unauthorized" });

  let body = "";
  for await (const chunk of req) { body += chunk; if (body.length > 10_000) return send(413, { error: "too large" }); }
  try {
    const t = JSON.parse(body);
    const result = t.kind === "tcp" ? await checkTcp(String(t.host), Number(t.port)) : await checkHttp(String(t.url), t.keyword);
    send(200, { region: REGION, ...result });
  } catch (e) {
    send(200, { region: REGION, status: "down", error: e instanceof Error ? e.message : "check failed" });
  }
}).listen(PORT, () => console.log(`probe ${REGION} listening on ${PORT}`));
