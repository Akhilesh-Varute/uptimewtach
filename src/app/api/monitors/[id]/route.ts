import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

async function getMonitorForUser(monitorId: string, clerkId: string) {
  const { data: user } = await getSupabaseAdmin()
    .from("users").select("id").eq("clerk_id", clerkId).single();
  if (!user) return null;
  const { data: monitor } = await getSupabaseAdmin()
    .from("monitors").select("*").eq("id", monitorId).eq("user_id", user.id).single();
  return monitor;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const monitor = await getMonitorForUser(id, userId);
  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch last 24h checks
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: checks } = await getSupabaseAdmin()
    .from("monitor_checks")
    .select("status, response_time_ms, checked_at")
    .eq("monitor_id", id)
    .gte("checked_at", since)
    .order("checked_at", { ascending: true });

  // Fetch open incidents
  const { data: incidents } = await getSupabaseAdmin()
    .from("incidents")
    .select("*")
    .eq("monitor_id", id)
    .order("started_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ monitor, checks: checks ?? [], incidents: incidents ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const monitor = await getMonitorForUser(id, userId);
  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const allowed = ["name", "is_active"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await getSupabaseAdmin()
    .from("monitors").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: "Failed to update monitor" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const monitor = await getMonitorForUser(id, userId);
  if (!monitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await getSupabaseAdmin().from("monitors").delete().eq("id", id);
  return new NextResponse(null, { status: 204 });
}
