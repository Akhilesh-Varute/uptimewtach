import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/apikey";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await validateApiKey(req.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const { id } = await params;

  const { data: monitor } = await getSupabaseAdmin()
    .from("monitors")
    .select("id, name, url, monitor_type, host, port, status, is_active, last_checked_at, created_at, ssl_days_remaining, ssl_expires_at")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!monitor) return NextResponse.json({ error: "Monitor not found" }, { status: 404 });

  // Last 24h uptime
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: checks } = await getSupabaseAdmin()
    .from("monitor_checks")
    .select("status, response_time_ms, checked_at")
    .eq("monitor_id", id)
    .gte("checked_at", since)
    .order("checked_at", { ascending: false })
    .limit(100);

  const uptime =
    checks && checks.length > 0
      ? (checks.filter((c) => c.status === "up").length / checks.length) * 100
      : 100;

  const avgMs =
    checks && checks.length > 0
      ? checks.reduce((s, c) => s + (c.response_time_ms ?? 0), 0) / checks.length
      : null;

  return NextResponse.json({
    monitor,
    uptime_24h: parseFloat(uptime.toFixed(2)),
    avg_response_ms: avgMs ? Math.round(avgMs) : null,
    recent_checks: checks ?? [],
  });
}
