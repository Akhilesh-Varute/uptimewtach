import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PLAN_LIMITS } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: page, error } = await getSupabaseAdmin()
    .from("status_pages")
    .select("*, status_page_monitors(sort_order, display_name, monitors(id, name, status, url, last_checked_at))")
    .eq("slug", slug)
    .single();

  if (error || !page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const monitorRows = (page.status_page_monitors ?? [])
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);

  const withUptime = await Promise.all(
    monitorRows.map(async (row: { monitors: { id: string; name: string; status: string }; display_name: string | null }) => {
      const monitor = row.monitors;
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data: checks } = await getSupabaseAdmin()
        .from("monitor_checks")
        .select("status")
        .eq("monitor_id", monitor.id)
        .gte("checked_at", since);

      const total = checks?.length ?? 0;
      const up = checks?.filter((c: { status: string }) => c.status === "up").length ?? 0;
      const uptime = total > 0 ? (up / total) * 100 : 100;

      return { ...monitor, display_name: row.display_name ?? monitor.name, uptime };
    })
  );

  return NextResponse.json({ page, monitors: withUptime });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  const { data: user } = await getSupabaseAdmin()
    .from("users").select("id, plan").eq("clerk_id", userId).single();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if ("custom_domain" in body && body.custom_domain) {
    const canUseCustomDomain = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS]?.customDomains ?? false;
    if (!canUseCustomDomain) {
      return NextResponse.json({ error: "Custom domains require Pro plan or higher." }, { status: 403 });
    }
  }

  const allowed = ["custom_domain", "title", "description"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key] === "" ? null : body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("status_pages")
    .update(updates)
    .eq("id", slug)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This domain is already in use." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  const { data: user } = await getSupabaseAdmin()
    .from("users").select("id").eq("clerk_id", userId).single();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await getSupabaseAdmin()
    .from("status_pages")
    .delete()
    .eq("id", slug)
    .eq("user_id", user.id);

  return new NextResponse(null, { status: 204 });
}
