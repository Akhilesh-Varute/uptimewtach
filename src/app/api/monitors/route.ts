import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createMonitor } from "@/lib/monitors";


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

  const result = await createMonitor(user, await req.json());
  return NextResponse.json(result.body, { status: result.status });
}
