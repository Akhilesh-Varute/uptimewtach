import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PLAN_LIMITS } from "@/lib/utils";

async function getMonitorForUser(monitorId: string, clerkId: string) {
  const { data: user } = await getSupabaseAdmin()
    .from("users").select("id, plan").eq("clerk_id", clerkId).single();
  if (!user) return null;
  const { data: monitor } = await getSupabaseAdmin()
    .from("monitors").select("*").eq("id", monitorId).eq("user_id", user.id).single();
  return monitor ? { monitor, plan: user.plan as string } : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await getMonitorForUser(id, userId);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { monitor, plan } = result;
  const historyDays = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.historyDays ?? 7;
  const since = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: checks } = await getSupabaseAdmin()
    .from("monitor_checks")
    .select("status, response_time_ms, checked_at")
    .eq("monitor_id", id)
    .gte("checked_at", since)
    .order("checked_at", { ascending: true });

  const { data: incidents } = await getSupabaseAdmin()
    .from("incidents")
    .select("*")
    .eq("monitor_id", id)
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ monitor, checks: checks ?? [], incidents: incidents ?? [], historyDays });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await getMonitorForUser(id, userId);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const allowed = ["name", "is_active", "webhook_url", "keyword"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key] || null;
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
  const result = await getMonitorForUser(id, userId);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await getSupabaseAdmin().from("monitors").delete().eq("id", id);
  return new NextResponse(null, { status: 204 });
}
