import axios from "axios";
import { getSupabaseAdmin, Monitor } from "./supabase";
import { sendDownAlert, sendUpAlert, sendSslExpiryAlert } from "./email";
import { checkSslCert, getSslAlertThreshold } from "./ssl";
import { sendWebhook } from "./webhooks";
import { checkTcp } from "./tcp";

export async function checkUrl(
  url: string,
  keyword?: string | null
): Promise<{
  status: "up" | "down";
  response_time_ms: number | null;
  status_code: number | null;
  error_message: string | null;
}> {
  const start = Date.now();
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: (s) => s < 500,
      maxRedirects: 5,
      headers: { "User-Agent": "UptimeWatch/1.0 Monitoring Bot" },
    });
    const elapsed = Date.now() - start;
    let isUp = response.status < 400;
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
    return {
      status: "down",
      response_time_ms: elapsed < 10000 ? elapsed : null,
      status_code: null,
      error_message: message,
    };
  }
}

export async function runChecks() {
  const now = new Date();
  const { data: monitors, error } = await getSupabaseAdmin()
    .from("monitors")
    .select("*")
    .eq("is_active", true);

  if (error || !monitors) {
    console.error("Failed to fetch monitors:", error);
    return;
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

  let result: {
    status: "up" | "down";
    response_time_ms: number | null;
    status_code: number | null;
    error_message: string | null;
  };

  if (monitor.monitor_type === "tcp" && monitor.host && monitor.port) {
    const tcp = await checkTcp(monitor.host, monitor.port);
    result = {
      status: tcp.status,
      response_time_ms: tcp.response_time_ms,
      status_code: null,
      error_message: tcp.error_message,
    };
  } else {
    result = await checkUrl(monitor.url, monitor.keyword);
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
    processSslCheck(monitor).catch(console.error);
  }

  await getSupabaseAdmin()
    .from("monitors")
    .update({ status: newStatus, last_checked_at: new Date().toISOString() })
    .eq("id", monitor.id);

  if (previousStatus !== "pending" && previousStatus !== newStatus) {
    await handleStatusChange(monitor, previousStatus as "up" | "down", newStatus);
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

  // Only write to DB when check succeeded — don't overwrite a valid value with null on transient errors
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
      ssl.daysRemaining
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

async function handleStatusChange(
  monitor: Monitor,
  from: "up" | "down",
  to: "up" | "down"
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
    await getSupabaseAdmin().from("incidents").insert({
      monitor_id: monitor.id,
      started_at: now,
      status: "ongoing",
    });
    if (user) await sendDownAlert(user.email, monitor.name, monitorUrl);
    if (monitor.webhook_url) {
      await sendWebhook(monitor.webhook_url, {
        event: "down",
        monitorName: monitor.name,
        url: monitorUrl,
        timestamp: now,
      });
    }
  } else if (to === "up" && from === "down") {
    await getSupabaseAdmin()
      .from("incidents")
      .update({ resolved_at: now, status: "resolved" })
      .eq("monitor_id", monitor.id)
      .eq("status", "ongoing");
    if (user) await sendUpAlert(user.email, monitor.name, monitorUrl);
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
