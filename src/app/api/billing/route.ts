import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, User } from "@/lib/supabase";
import { dodo, PRODUCT_BY_PLAN } from "@/lib/dodo";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json();
  const productId = PRODUCT_BY_PLAN[plan];
  if (!productId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const { data: user } = await getSupabaseAdmin()
    .from("users").select("*").eq("clerk_id", userId).single() as { data: User | null };
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const session = await dodo().checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email },
      metadata: { user_id: user.id, plan },
      return_url: `${APP_URL}/dashboard?upgraded=true`,
    });
    if (!session.checkout_url) return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
    return NextResponse.json({ url: session.checkout_url });
  } catch {
    return NextResponse.json({ error: "Payment service unavailable. Please try again." }, { status: 500 });
  }
}
