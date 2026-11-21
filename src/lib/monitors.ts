// Monitor rules shared by the dashboard API and the agent (MCP) API, so both enforce the same limits.
import * as crypto from "crypto";
import { getSupabaseAdmin } from "./supabase";
import { PLAN_LIMITS } from "./utils";
import { assertPublicHost } from "./netguard";

type Plan = keyof typeof PLAN_LIMITS;
export type Owner = { id: string; plan: string };
export type Result = { status: number; body: Record<string, unknown> };

export type MonitorInput = {
  name?: string;
  url?: string;
  monitor_type?: string;
  host?: string;
  port?: string | number;
  keyword?: string;
  webhook_url?: string;
  heartbeat_grace_seconds?: string | number;
};

const limitsFor = (plan: string) => PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free;
const fail = (status: number, error: string): Result => ({ status, body: { error } });

async function blockedTarget(host: string): Promise<string | null> {
  try { await assertPublicHost(host); return null; } catch (e) {
    return e instanceof Error && e.message.startsWith("Blocked") ? e.message : "Host could not be resolved";
  }
}

export async function createMonitor(owner: Owner, input: MonitorInput): Promise<Result> {
  const db = getSupabaseAdmin();
  const limits = limitsFor(owner.plan);

  const { count } = await db.from("monitors").select("id", { count: "exact", head: true }).eq("user_id", owner.id);
  if ((count ?? 0) >= limits.monitors) return fail(403, `Monitor limit reached for ${owner.plan} plan`);

  const { name, url, webhook_url, keyword, monitor_type, host, port, heartbeat_grace_seconds } = input;
  if (webhook_url && !limits.webhooks) return fail(403, "Webhook alerts require Pro plan or higher.");
  if (!name) return fail(400, "name is required");

  if (webhook_url) {
    let hookHost: string;
    try { hookHost = new URL(webhook_url).hostname; } catch { return fail(400, "Invalid webhook URL"); }
    const blocked = await blockedTarget(hookHost);
    if (blocked) return fail(400, blocked);
  }

  const base = { user_id: owner.id, name, interval_seconds: limits.interval, webhook_url: webhook_url || null };
  let row: Record<string, unknown>;

  if (monitor_type === "heartbeat") {
    const token = crypto.randomBytes(24).toString("hex");
    row = {
      ...base, url: "heartbeat://" + token, monitor_type: "heartbeat", heartbeat_token: token,
      heartbeat_grace_seconds: parseInt(String(heartbeat_grace_seconds ?? "300"), 10) || 300,
    };
  } else if (monitor_type === "tcp") {
    if (!host || !port) return fail(400, "host and port are required for TCP monitors");
    const portNum = parseInt(String(port), 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) return fail(400, "Invalid port number");
    const blocked = await blockedTarget(String(host));
    if (blocked) return fail(400, blocked);
    row = { ...base, url: `tcp://${host}:${portNum}`, monitor_type: "tcp", host, port: portNum };
  } else {
    if (!url) return fail(400, "url is required");
    let parsed: URL;
    try {
      parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch { return fail(400, "Invalid URL"); }
    const blocked = await blockedTarget(parsed.hostname);
    if (blocked) return fail(400, blocked);
    row = { ...base, url: parsed.toString(), monitor_type: "http", keyword: keyword || null };
  }

  const { data, error } = await db.from("monitors").insert(row).select().single();
  if (error) return fail(500, "Failed to create monitor");
  return { status: 201, body: data };
}

/** Error message if resuming one more monitor would exceed the plan's active limit, else null. */
export async function activeLimitError(owner: Owner): Promise<string | null> {
  const limit = limitsFor(owner.plan).monitors;
  const { count } = await getSupabaseAdmin()
    .from("monitors").select("id", { count: "exact", head: true })
    .eq("user_id", owner.id).eq("is_active", true);
  return (count ?? 0) >= limit ? `Your ${owner.plan} plan allows ${limit} active monitors. Pause another or upgrade.` : null;
}
