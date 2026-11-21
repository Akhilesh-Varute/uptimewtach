// MCP server: lets AI agents (Claude, Cursor, ChatGPT, VS Code) manage and investigate monitors.
// Auth: the user's UptimeWatch API key as a Bearer token (same keys as the REST API, Starter plan and up).
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { validateApiKey } from "@/lib/apikey";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createMonitor, activeLimitError } from "@/lib/monitors";
import { checkUrl } from "@/lib/monitoring";
import { diagnose } from "@/lib/diagnose";

type Ctx = { http?: { authInfo?: { clientId: string } } };

// withMcpAuth guarantees a verified key, and clientId carries the owning user id.
const userIdOf = (ctx: unknown) => (ctx as Ctx).http?.authInfo?.clientId ?? "";
const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const error = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });

async function owner(userId: string) {
  const { data } = await getSupabaseAdmin().from("users").select("id, plan").eq("id", userId).single();
  return data as { id: string; plan: string } | null;
}

async function latestIncident(monitorId: string) {
  const { data } = await getSupabaseAdmin()
    .from("incidents").select("*").eq("monitor_id", monitorId)
    .order("started_at", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

const handler = createMcpHandler((server) => {
  server.registerTool(
    "list_monitors",
    {
      title: "List monitors",
      description: "List all of the user's monitors with their current status (up, down, pending) and whether they are paused.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const { data } = await getSupabaseAdmin()
        .from("monitors")
        .select("id, name, url, monitor_type, status, is_active, last_checked_at, interval_seconds, ssl_days_remaining")
        .eq("user_id", userIdOf(ctx))
        .order("created_at", { ascending: false });
      return json({ monitors: data ?? [] });
    },
  );

  server.registerTool(
    "get_monitor",
    {
      title: "Get monitor details",
      description: "Status, 24h uptime, average response time, recent checks and the latest incident (with its likely cause) for one monitor.",
      inputSchema: z.object({ id: z.string().describe("Monitor id from list_monitors") }),
    },
    async ({ id }, ctx) => {
      const db = getSupabaseAdmin();
      const { data: monitor } = await db.from("monitors").select("*").eq("id", id).eq("user_id", userIdOf(ctx)).single();
      if (!monitor) return error("Monitor not found.");
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { data: checks } = await db
        .from("monitor_checks").select("status, response_time_ms, status_code, error_message, checked_at")
        .eq("monitor_id", id).gte("checked_at", since).order("checked_at", { ascending: false }).limit(50);
      const list = checks ?? [];
      const up = list.filter((c) => c.status === "up");
      const { heartbeat_token, ...safe } = monitor; // never hand the ping secret to an agent
      return json({
        monitor: { ...safe, has_heartbeat_url: !!heartbeat_token },
        uptime_24h_percent: list.length ? +((up.length / list.length) * 100).toFixed(2) : null,
        avg_response_ms: up.length ? Math.round(up.reduce((s, c) => s + (c.response_time_ms ?? 0), 0) / up.length) : null,
        latest_incident: await latestIncident(id),
        recent_checks: list.slice(0, 10),
      });
    },
  );

  server.registerTool(
    "list_incidents",
    {
      title: "List incidents",
      description: "Recent outages across all monitors (or one monitor), newest first, each with start/end time and the likely cause.",
      inputSchema: z.object({
        monitor_id: z.string().optional().describe("Only incidents for this monitor"),
        limit: z.number().int().min(1).max(50).optional().describe("Default 10"),
      }),
    },
    async ({ monitor_id, limit }, ctx) => {
      const db = getSupabaseAdmin();
      const { data: mine } = await db.from("monitors").select("id, name").eq("user_id", userIdOf(ctx));
      const names = new Map((mine ?? []).map((m) => [m.id, m.name]));
      const ids = monitor_id ? [monitor_id].filter((i) => names.has(i)) : [...names.keys()];
      if (!ids.length) return json({ incidents: [] });
      const { data } = await db
        .from("incidents").select("*").in("monitor_id", ids)
        .order("started_at", { ascending: false }).limit(limit ?? 10);
      return json({ incidents: (data ?? []).map((i) => ({ ...i, monitor_name: names.get(i.monitor_id) })) });
    },
  );

  server.registerTool(
    "create_monitor",
    {
      title: "Create monitor",
      description: "Start monitoring a website (http), a server port (tcp) or a scheduled job (heartbeat). Plan limits apply. Private/internal addresses are rejected.",
      inputSchema: z.object({
        name: z.string().min(1),
        monitor_type: z.enum(["http", "tcp", "heartbeat"]).default("http"),
        url: z.string().optional().describe("Required for http, e.g. https://example.com/health"),
        keyword: z.string().optional().describe("http only: text that must appear on the page"),
        host: z.string().optional().describe("Required for tcp"),
        port: z.number().int().optional().describe("Required for tcp"),
        heartbeat_grace_seconds: z.number().int().optional().describe("heartbeat only: how late a ping may be"),
      }),
    },
    async (args, ctx) => {
      const me = await owner(userIdOf(ctx));
      if (!me) return error("Account not found.");
      const result = await createMonitor(me, args);
      if (result.status >= 400) return error(String(result.body.error));
      const { heartbeat_token, ...safe } = result.body as Record<string, unknown>;
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";
      return json({
        monitor: safe,
        ...(heartbeat_token ? { ping_url: `${origin}/api/heartbeat/${heartbeat_token}`, note: "Call ping_url at the end of each successful job run." } : {}),
      });
    },
  );

  server.registerTool(
    "set_monitor_paused",
    {
      title: "Pause or resume monitor",
      description: "Pause a monitor (stops checks and alerts) or resume it. Resuming respects the plan's active-monitor limit.",
      inputSchema: z.object({ id: z.string(), paused: z.boolean() }),
    },
    async ({ id, paused }, ctx) => {
      const me = await owner(userIdOf(ctx));
      if (!me) return error("Account not found.");
      if (!paused) {
        const limitErr = await activeLimitError(me);
        if (limitErr) return error(limitErr);
      }
      const { data } = await getSupabaseAdmin()
        .from("monitors").update({ is_active: !paused }).eq("id", id).eq("user_id", me.id)
        .select("id, name, is_active").single();
      return data ? json({ monitor: data }) : error("Monitor not found.");
    },
  );

  server.registerTool(
    "check_url_now",
    {
      title: "Check a URL now",
      description: "Run a one-off check of any public URL and explain the result in plain English (likely cause and next step if it fails). Does not create a monitor.",
      inputSchema: z.object({ url: z.string().url(), keyword: z.string().optional() }),
    },
    // ponytail: no per-key rate limit on one-off checks yet; add one if this gets abused.
    async ({ url, keyword }) => {
      const r = await checkUrl(url, keyword);
      if (r.status === "up") return json({ status: "up", status_code: r.status_code, response_time_ms: r.response_time_ms });
      return json({
        status: "down",
        status_code: r.status_code,
        error: r.error_message,
        diagnosis: diagnose({ statusCode: r.status_code, errorMessage: r.error_message, responseTimeMs: r.response_time_ms }),
      });
    },
  );
}, { serverInfo: { name: "uptimewatch", version: "1.0.0" } });

const authed = withMcpAuth(
  handler,
  async (_req, token) => {
    const userId = await validateApiKey(token ? `Bearer ${token}` : null);
    return userId ? { token: token!, clientId: userId, scopes: ["monitors"] } : undefined;
  },
  { required: true },
);

export { authed as GET, authed as POST };
