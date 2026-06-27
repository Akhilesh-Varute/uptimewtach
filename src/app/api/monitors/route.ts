import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PLAN_LIMITS } from "@/lib/utils";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await getSupabaseAdmin()
    .from("users").select("id").eq("clerk_id", userId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data, error } = await getSupabaseAdmin()
    .from("monitors")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load monitors" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await getSupabaseAdmin()
    .from("users").select("id, plan").eq("clerk_id", userId).single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Check plan limit
  const { count } = await getSupabaseAdmin()
    .from("monitors").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  const limit = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS]?.monitors ?? 3;
  if ((count ?? 0) >= limit) {
    return NextResponse.json({ error: `Monitor limit reached for ${user.plan} plan` }, { status: 403 });
  }

  const body = await req.json();
  const { name, url } = body;

  if (!name || !url) {
    return NextResponse.json({ error: "name and url are required" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const interval = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS]?.interval ?? 300;

  const { data, error } = await getSupabaseAdmin()
    .from("monitors")
    .insert({ user_id: user.id, name, url: parsedUrl.toString(), interval_seconds: interval })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create monitor" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
