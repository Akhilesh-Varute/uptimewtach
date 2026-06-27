import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { lemonSqueezySetup, createCheckout, listOrders } from "@lemonsqueezy/lemonsqueezy.js";
import { getSupabaseAdmin, User } from "@/lib/supabase";

function setupLS() {
  lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });
}

const VARIANT_IDS: Record<string, string> = {
  starter: process.env.LS_STARTER_VARIANT_ID!,
  pro: process.env.LS_PRO_VARIANT_ID!,
  business: process.env.LS_BUSINESS_VARIANT_ID!,
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json();
  if (!VARIANT_IDS[plan]) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const { data: user } = await getSupabaseAdmin()
    .from("users").select("*").eq("clerk_id", userId).single() as { data: User | null };
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  setupLS();

  const { data, error } = await createCheckout(
    process.env.LS_STORE_ID!,
    VARIANT_IDS[plan],
    {
      checkoutData: {
        email: user.email,
        custom: { user_id: user.id, plan },
      },
      checkoutOptions: {
        embed: false,
      },
      productOptions: {
        redirectUrl: `${APP_URL}/dashboard?upgraded=true`,
        receiptButtonText: "Go to Dashboard",
      },
    }
  );

  if (error || !data) return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });

  return NextResponse.json({ url: data.data.attributes.url });
}

// Customer portal — list recent orders for now (LS portal link)
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  setupLS();
  const { data: user } = await getSupabaseAdmin()
    .from("users").select("email").eq("clerk_id", userId).single();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ portal_url: "https://app.lemonsqueezy.com/my-orders" });
}
