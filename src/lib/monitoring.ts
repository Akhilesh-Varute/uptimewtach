import axios from "axios";
import { getSupabaseAdmin, Monitor, MonitorCheck } from "./supabase";
import { sendDownAlert, sendUpAlert } from "./email";

export async function checkUrl(url: string): Promise<{
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
    const isUp = response.status < 400;
    return {
      status: isUp ? "up" : "down",
      response_time_ms: elapsed,
      status_code: response.status,
      error_message: isUp ? null : `HTTP ${response.status}`,
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

  // Fetch all active monitors that are due for a check
  const { data: monitors, error } = await getSupabaseAdmin()
    .from("monitors")
    .select("*")
    .eq("is_active", true);

  if (error || !monitors) {
    console.error("Failed to fetch monitors:", error);
    return;
  }

  // Filter monitors that are due (last_checked_at + interval <= now)
  const due = monitors.filter((m: Monitor) => {
    if (!m.last_checked_at) return true;
    const nextCheck = new Date(m.last_checked_at).getTime() + m.interval_seconds * 1000;
    return nextCheck <= now.getTime();
  });

  await Promise.all(due.map((monitor: Monitor) => processMonitor(monitor)));
}

async function processMonitor(monitor: Monitor) {
  const result = await checkUrl(monitor.url);

  // Store the check result
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

  // Update monitor's current status and last_checked_at
  await getSupabaseAdmin()
    .from("monitors")
    .update({ status: newStatus, last_checked_at: new Date().toISOString() })
    .eq("id", monitor.id);

  // Handle status transitions
  if (previousStatus !== "pending" && previousStatus !== newStatus) {
    await handleStatusChange(monitor, previousStatus as "up" | "down", newStatus);
  }
}

async function handleStatusChange(
  monitor: Monitor,
  from: "up" | "down",
  to: "up" | "down"
) {
  // Get user email
  const { data: user } = await getSupabaseAdmin()
    .from("users")
    .select("email")
    .eq("id", monitor.user_id)
    .single();

  if (!user) return;

  if (to === "down") {
    // Open new incident
    await getSupabaseAdmin().from("incidents").insert({
      monitor_id: monitor.id,
      started_at: new Date().toISOString(),
      status: "ongoing",
    });
    await sendDownAlert(user.email, monitor.name, monitor.url);
  } else if (to === "up" && from === "down") {
    // Resolve open incident
    await getSupabaseAdmin()
      .from("incidents")
      .update({ resolved_at: new Date().toISOString(), status: "resolved" })
      .eq("monitor_id", monitor.id)
      .eq("status", "ongoing");
    await sendUpAlert(user.email, monitor.name, monitor.url);
  }
}

export async function getUptimePercent(monitorId: string, hours = 24): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data: checks } = await getSupabaseAdmin()
    .from("monitor_checks")
    .select("status")
    .eq("monitor_id", monitorId)
    .gte("checked_at", since);

  if (!checks || checks.length === 0) return 100;
  const upCount = (checks as { status: string }[]).filter((c) => c.status === "up").length;
  return (upCount / checks.length) * 100;
}
