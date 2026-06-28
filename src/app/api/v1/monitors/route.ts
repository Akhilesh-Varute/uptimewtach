import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/apikey";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const userId = await validateApiKey(req.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("monitors")
    .select("id, name, url, monitor_type, host, port, status, is_active, last_checked_at, created_at, ssl_days_remaining")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch monitors" }, { status: 500 });

  return NextResponse.json({ monitors: data, count: data?.length ?? 0 });
}
