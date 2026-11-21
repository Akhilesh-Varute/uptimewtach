import axios from "axios";
import * as http from "http";
import * as https from "https";
import { assertPublicHost, assertPublicLiteral, safeLookup } from "./netguard";
import { getSupabaseAdmin, Monitor } from "./supabase";
import { sendDownAlert, sendUpAlert, sendSslExpiryAlert } from "./email";
import { checkSslCert, getSslAlertThreshold } from "./ssl";
import { sendWebhook } from "./webhooks";
import { sendPush } from "./push";
import { checkTcp } from "./tcp";
import { diagnose, summarize } from "./diagnose";
import { confirmWithRegions } from "./probes";

type CheckResult = {
  status: "up" | "down";
  response_time_ms: number | null;
  status_code: number | null;
  error_message: string | null;
  regions?: string | null; // multi-region summary, set when probes were consulted
};

const REACHABLE_STATUSES = [401, 403, 429];

export async function checkUrl(
  url: string,
  keyword?: string | null
): Promise<CheckResult> {
  const start = Date.now();
  try {
    await assertPublicHost(new URL(url).hostname);
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: (s) => s < 500,
      maxRedirects: 5,
      httpAgent: new http.Agent({ lookup: safeLookup }),
      httpsAgent: new https.Agent({ lookup: safeLookup }),
      beforeRedirect: (opts) => assertPublicLiteral(String(opts.hostname ?? "")),
      headers: { "User-Agent": "UptimeWatch/1.0 Monitoring Bot" },
    });
    const elapsed = Date.now() - start;
    // 401/403/429 mean the server answered but won't serve a bot (auth, WAF, rate limit): reachable, so up.
    let isUp = response.status < 400 || REACHABLE_STATUSES.includes(response.status);
    let errorMessage: string | null = isUp ? null : "HTTP " + response.status;

    if (isUp && keyword) {
      const body =
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data);
      if (!body.includes(keyword)) {
        isUp = false;
        errorMessage = "Keyword \"" + keyword + "\" not found";
      }
    }

    return {
      status: isUp ? "up" : "down",
      response_time_ms: elapsed,
      status_code: response.status,
      error_message: errorMessage,
    };
  } catch (err: unknown) {
    const elapsed = Date.now() - start;
    const message = err instanceof Error ? err.message : "Unknown error";
    const httpStatus = (err as { response?: { status?: number } }).response?.status ?? null;
    return {
      status: "down",
      response_time_ms: elapsed < 10000 ? elapsed : null,
      status_code: httpStatus,
      error_message: message,
    };
  }
}

/**
 * A single failed probe is often a blip (network, cold start, slow response) rather than an outage.
 * Re-check a failing target a couple of times before reporting it down; any success wins.
 * ponytail: retries run inside one cron call; consecutive-failure counting across runs needs a DB column.
 */
export async function confirmDown<T extends { status: "up" | "down" }>(
  check: () => Promise<T>,
  retries = 2,
  delayMs = 2000
): Promise<T> {
  let result = await check();
  for (let i = 0; i < retries && result.status === "down"; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await check();
  }
  return result;
}

export async function runChecks() {
  const now = new Date();
  // PostgREST returns at most 1,000 rows per request, so page through all active monitors.
  const monitors: Monitor[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await getSupabaseAdmin()
      .from("monitors")
      .select("*")
      .eq("is_active", true)
      .order("id")
      .range(from, from + 999);
    if (error || !data) {
      console.error("Failed to fetch monitors:", error);
      return;
    }
    monitors.push(...(data as Monitor[]));
    if (data.length < 1000) break;
  }

  const due = monitors.filter((m: Monitor) => {
    if (m.monitor_type === "heartbeat") return true;
    if (!m.last_checked_at) return true;
    const nextCheck =
      new Date(m.last_checked_at).getTime() + m.interval_seconds * 1000;
    return nextCheck <= now.getTime();
  });

  await Promise.all(due.map((monitor: Monitor) => processMonitor(monitor)));
}

async function processMonitor(monitor: Monitor) {
  if (monitor.monitor_type === "heartbeat") {
    await processHeartbeat(monitor);
    return;
  }

  let result: CheckResult;

  if (monitor.monitor_type === "tcp" && monitor.host && monitor.port) {
    const tcp = await confirmDown(() => checkTcp(monitor.host!, monitor.port!));
    result = {
      status: tcp.status,
      response_time_ms: tcp.response_time_ms,
      status_code: null,
      error_message: tcp.error_message,
    };
  } else {
    result = await confirmDown(() => checkUrl(monitor.url, monitor.keyword));
  }

  // About to raise a new outage: make other regions agree first, so one region's network blip doesn't alert.
  if (result.status === "down" && monitor.status === "up") {
    const target = monitor.monitor_type === "tcp" && monitor.host && monitor.port
      ? { kind: "tcp" as const, host: monitor.host, port: monitor.port }
      : { kind: "http" as const, url: monitor.url, keyword: monitor.keyword };
    const verdict = await confirmWithRegions(target);
    result = verdict.confirmed
      ? { ...result, regions: verdict.summary }
      : { ...result, status: "up", error_message: `Primary region failed (${result.error_message}). ${verdict.summary}` };
  }

  await getSupabaseAdmin().from("monitor_checks").insert({
    monitor_id: monitor.id,
    status: result.status,
    response_time_ms: result.response_time_ms,
    status_code: result.status_code,
    error_message: result.error_message,
    checked_at: new Date().toISOString(),
  });

  const previousStatus = monitor.status;
  const newStatus = result.status;

  if (monitor.monitor_type !== "tcp" && monitor.url.startsWith("https://")) {
    await processSslCheck(monitor).catch(console.error);
  }

  await getSupabaseAdmin()
    .from("monitors")
    .update({ status: newStatus, last_checked_at: new Date().toISOString() })
    .eq("id", monitor.id);

  if (previousStatus !== "pending" && previousStatus !== newStatus) {
    await handleStatusChange(monitor, previousStatus as "up" | "down", newStatus, result);
  }
}

async function processHeartbeat(monitor: Monitor) {
  const grace = monitor.heartbeat_grace_seconds ?? 300;
  const interval = monitor.interval_seconds ?? 300;
  const deadline = interval + grace;

  const lastPing = monitor.heartbeat_last_pinged_at
    ? new Date(monitor.heartbeat_last_pinged_at).getTime()
    : null;

  const elapsed = lastPing ? (Date.now() - lastPing) / 1000 : Infinity;
  const previousStatus = monitor.status;
  const newStatus: "up" | "down" = elapsed <= deadline ? "up" : "down";

  if (previousStatus !== newStatus) {
    await getSupabaseAdmin().from("monitor_checks").insert({
      monitor_id: monitor.id,
      status: newStatus,
      response_time_ms: null,
      status_code: null,
      error_message:
        newStatus === "down"
          ? "No heartbeat received within " + deadline + "s"
          : null,
      checked_at: new Date().toISOString(),
    });

    await getSupabaseAdmin()
      .from("monitors")
      .update({ status: newStatus, last_checked_at: new Date().toISOString() })
      .eq("id", monitor.id);

    if (previousStatus !== "pending") {
      await handleStatusChange(monitor, previousStatus as "up" | "down", newStatus);
    }
  }
}

async function processSslCheck(monitor: Monitor) {
  const ssl = await checkSslCert(monitor.url);
  if (ssl.error === "not-https" || ssl.error === "invalid-url") return;

  if (ssl.error !== null) {
    console.warn("SSL check error for", monitor.url, ":", ssl.error);
    return;
  }

  await getSupabaseAdmin()
    .from("monitors")
    .update({
      ssl_expires_at: ssl.expiresAt?.toISOString() ?? null,
      ssl_days_remaining: ssl.daysRemaining,
    })
    .eq("id", monitor.id);

  if (ssl.daysRemaining === null) return;

  const threshold = getSslAlertThreshold(ssl.daysRemaining);
  if (!threshold) return;

  const alreadyAlerted =
    monitor.ssl_last_alerted_days !== null &&
    monitor.ssl_last_alerted_days <= threshold;
  if (alreadyAlerted) return;

  const { data: user } = await getSupabaseAdmin()
    .from("users")
    .select("email")
    .eq("id", monitor.user_id)
    .single();

  if (user && ssl.daysRemaining !== null) {
    await sendSslExpiryAlert(
      user.email,
      monitor.name,
      monitor.url,
      ssl.daysRemaining,
      { expiresAt: ssl.expiresAt ?? null, issuer: ssl.issuer ?? null }
    );
  }

  if (monitor.webhook_url) {
    await sendWebhook(monitor.webhook_url, {
      event: "ssl_expiring",
      monitorName: monitor.name,
      url: monitor.url,
      timestamp: new Date().toISOString(),
      details: "SSL cert expires in " + ssl.daysRemaining + " days",
    });
  }

  await getSupabaseAdmin()
    .from("monitors")
    .update({ ssl_last_alerted_days: threshold })
    .eq("id", monitor.id);
}

/** What recent history says about a monitor: when it last worked and how fast it usually answers. */
async function recentEvidence(monitorId: string) {
  const { data } = await getSupabaseAdmin()
    .from("monitor_checks")
    .select("response_time_ms, checked_at")
    .eq("monitor_id", monitorId)
    .eq("status", "up")
    .order("checked_at", { ascending: false })
    .limit(10);
  const times = (data ?? []).map((c) => c.response_time_ms).filter((t): t is number => typeof t === "number");
  return {
    lastUpAt: data?.[0]?.checked_at ?? null,
    typicalMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
  };
}

async function handleStatusChange(
  monitor: Monitor,
  from: "up" | "down",
  to: "up" | "down",
  checkResult?: CheckResult
) {
  const { data: user } = await getSupabaseAdmin()
    .from("users")
    .select("email")
    .eq("id", monitor.user_id)
    .single();

  const now = new Date().toISOString();
  const monitorUrl =
    monitor.monitor_type === "tcp"
      ? monitor.host + ":" + monitor.port
      : monitor.monitor_type === "heartbeat"
      ? "heartbeat: " + monitor.name
      : monitor.url;

  if (to === "down") {
    const diagnosis = diagnose({
      statusCode: checkResult?.status_code ?? null,
      errorMessage: checkResult?.error_message ?? null,
      responseTimeMs: checkResult?.response_time_ms ?? null,
      sslDaysRemaining: monitor.ssl_days_remaining ?? null,
      regions: checkResult?.regions ?? null,
      ...(await recentEvidence(monitor.id)),
    });
    const cause = summarize(diagnosis);

    const incident = { monitor_id: monitor.id, started_at: now, status: "ongoing" };
    const { error: insertErr } = await getSupabaseAdmin().from("incidents").insert({ ...incident, cause });
    // ponytail: tolerate a database without the `cause` column yet; drop once the migration is run everywhere
    if (insertErr) await getSupabaseAdmin().from("incidents").insert(incident);

    if (user) await sendDownAlert(user.email, monitor.name, monitorUrl, {
      statusCode: checkResult?.status_code ?? null,
      errorMessage: checkResult?.error_message ?? null,
      intervalSeconds: monitor.interval_seconds,
      diagnosis,
    });
    await sendPush(monitor.user_id, { title: `${monitor.name} is DOWN`, body: cause });
    if (monitor.webhook_url) {
      await sendWebhook(monitor.webhook_url, {
        event: "down",
        monitorName: monitor.name,
        url: monitorUrl,
        timestamp: now,
        details: `${diagnosis.cause}: ${diagnosis.detail} Next step: ${diagnosis.nextStep}`,
      });
    }
  } else if (to === "up" && from === "down") {
    const { data: incident } = await getSupabaseAdmin()
      .from("incidents")
      .select("started_at")
      .eq("monitor_id", monitor.id)
      .eq("status", "ongoing")
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    await getSupabaseAdmin()
      .from("incidents")
      .update({ resolved_at: now, status: "resolved" })
      .eq("monitor_id", monitor.id)
      .eq("status", "ongoing");

    if (user) await sendUpAlert(user.email, monitor.name, monitorUrl, {
      downtimeStartedAt: incident?.started_at ?? null,
    });
    await sendPush(monitor.user_id, { title: `${monitor.name} is back UP`, body: monitorUrl });
    if (monitor.webhook_url) {
      await sendWebhook(monitor.webhook_url, {
        event: "up",
        monitorName: monitor.name,
        url: monitorUrl,
        timestamp: now,
      });
    }
  }
}

export async function getUptimePercent(
  monitorId: string,
  hours = 24
): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data: checks } = await getSupabaseAdmin()
    .from("monitor_checks")
    .select("status")
    .eq("monitor_id", monitorId)
    .gte("checked_at", since);

  if (!checks || checks.length === 0) return 100;
  const upCount = (checks as { status: string }[]).filter(
    (c) => c.status === "up"
  ).length;
  return (upCount / checks.length) * 100;
}
