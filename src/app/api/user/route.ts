import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Upsert user record on first dashboard visit
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const email = clerkUser.emailAddresses[0]?.emailAddress || "";

  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .upsert({ clerk_id: userId, email }, { onConflict: "clerk_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to save user" }, { status: 500 });
  return NextResponse.json(data);
}

// Dev-only plan switcher (in production this is handled by the Dodo webhook)
export async function PATCH(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json();
  const valid = ["free", "starter", "pro", "business"];
  if (!valid.includes(plan)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .update({ plan })
    .eq("clerk_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .select("*")
    .eq("clerk_id", userId)
    .single();

  if (error) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(data);
}
