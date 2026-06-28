import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateApiKey } from "@/lib/apikey";

async function getUserId(clerkId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("users").select("id").eq("clerk_id", clerkId).single();
  return data?.id ?? null;
}

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(clerkId);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data } = await getSupabaseAdmin()
    .from("api_keys")
    .select("id, name, key_prefix, created_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(clerkId);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Max 5 keys per user
  const { count } = await getSupabaseAdmin()
    .from("api_keys").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Maximum 5 API keys allowed" }, { status: 403 });
  }

  const body = await req.json();
  const name = (body.name as string)?.trim() || "My API Key";
  const { plaintext, hash, prefix } = generateApiKey();

  const { data, error } = await getSupabaseAdmin()
    .from("api_keys")
    .insert({ user_id: userId, name, key_hash: hash, key_prefix: prefix })
    .select("id, name, key_prefix, created_at")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create key" }, { status: 500 });

  // Return plaintext only once
  return NextResponse.json({ ...data, key: plaintext }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = await getUserId(clerkId);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await getSupabaseAdmin()
    .from("api_keys").delete().eq("id", id).eq("user_id", userId);

  return new NextResponse(null, { status: 204 });
}
