import { lookup as dnsLookup } from "dns";
import { lookup as dnsLookupAsync } from "dns/promises";
import * as net from "net";

// Monitors and webhooks make the server connect to addresses users typed in.
// Without a guard a user could point one at localhost, the cloud metadata address or an internal host.
// Set ALLOW_PRIVATE_TARGETS=true to monitor local services during development.

const allowPrivate = () => process.env.ALLOW_PRIVATE_TARGETS === "true";

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && ip.startsWith("192.0.0.")) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateV4(ip);
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6);
}

const BLOCKED = "Blocked: private or internal address";

function blockedName(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  return h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal");
}

/** Sync check for names and literal IPs only (no DNS). Safe inside redirect hooks. */
export function assertPublicLiteral(host: string): void {
  if (allowPrivate()) return;
  const h = host.replace(/^\[|\]$/g, "");
  if (blockedName(h) || (net.isIP(h) && isPrivateIp(h))) throw new Error(BLOCKED);
}

/** Throws unless the host is a public address (or resolves only to public addresses). */
export async function assertPublicHost(host: string): Promise<void> {
  if (allowPrivate()) return;
  const h = host.replace(/^\[|\]$/g, "");
  assertPublicLiteral(h);
  if (net.isIP(h)) return;
  const addrs = await dnsLookupAsync(h, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) throw new Error(BLOCKED);
}

/**
 * A dns.lookup replacement for sockets: checks the address actually connected to,
 * so redirects and DNS that changes between check and connect cannot reach a private address.
 * Literal IPs skip DNS, so call assertPublicHost on those first.
 */
export const safeLookup: typeof dnsLookup = ((host: string, options: unknown, cb?: unknown) => {
  const callback = (typeof options === "function" ? options : cb) as (...a: unknown[]) => void;
  const opts = (typeof options === "function" ? {} : options) as Record<string, unknown>;
  dnsLookup(host, opts, (err: unknown, address: unknown, family: unknown) => {
    if (err) return callback(err);
    const list = Array.isArray(address) ? (address as { address: string }[]).map((a) => a.address) : [address as string];
    if (!allowPrivate() && list.some((a) => isPrivateIp(a))) return callback(new Error(BLOCKED));
    callback(null, address, family);
  });
}) as typeof dnsLookup;
