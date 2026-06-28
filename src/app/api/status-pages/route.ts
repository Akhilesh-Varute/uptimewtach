import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PLAN_LIMITS } from "@/lib/utils";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await getSupabaseAdmin()
    .from("users").select("id").eq("clerk_id", userId).single();
  if (!user) return NextResponse.json([], { status: 200 });

  const { data } = await getSupabaseAdmin()
    .from("status_pages")
    .select("*, status_page_monitors(monitor_id, display_name, sort_order, monitors(id, name, status))")
    .eq("user_id", user.id);

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await getSupabaseAdmin()
    .from("users").select("id, plan").eq("clerk_id", userId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const limit = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS]?.statusPages ?? 1;
  if (limit !== null) {
    const { count } = await getSupabaseAdmin()
      .from("status_pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        { error: "Status page limit reached for " + user.plan + " plan. Upgrade to create more." },
        { status: 403 }
      );
    }
  }

  const { title, description, slug, monitor_ids } = await req.json();
  if (!title || !slug) return NextResponse.json({ error: "title and slug required" }, { status: 400 });

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const { data: page, error } = await getSupabaseAdmin()
    .from("status_pages")
    .insert({ user_id: user.id, title, description: description ?? "", slug: cleanSlug })
    .select().single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A status page with this slug already exists. Choose a different URL." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (monitor_ids?.length) {
    await getSupabaseAdmin().from("status_page_monitors").insert(
      monitor_ids.map((mid: string, i: number) => ({
        status_page_id: page.id,
        monitor_id: mid,
        sort_order: i,
      }))
    );
  }

  return NextResponse.json(page, { status: 201 });
}
