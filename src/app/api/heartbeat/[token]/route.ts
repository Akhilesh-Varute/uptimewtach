import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return handlePing(await params);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return handlePing(await params);
}

async function handlePing({ token }: { token: string }) {
  const now = new Date().toISOString();

  const { data: monitor } = await getSupabaseAdmin()
    .from("monitors")
    .select("id, is_active")
    .eq("heartbeat_token", token)
    .single();

  if (!monitor) {
    return NextResponse.json({ error: "Unknown heartbeat token" }, { status: 404 });
  }

  if (!monitor.is_active) {
    return NextResponse.json({ ok: false, message: "Monitor is paused" });
  }

  // Record ping and mark as up
  await getSupabaseAdmin()
    .from("monitors")
    .update({
      heartbeat_last_pinged_at: now,
      status: "up",
      last_checked_at: now,
    })
    .eq("id", monitor.id);

  await getSupabaseAdmin()
    .from("monitor_checks")
    .insert({
      monitor_id: monitor.id,
      status: "up",
      response_time_ms: null,
      status_code: null,
      error_message: null,
      checked_at: now,
    });

  return NextResponse.json({ ok: true, received_at: now });
}
