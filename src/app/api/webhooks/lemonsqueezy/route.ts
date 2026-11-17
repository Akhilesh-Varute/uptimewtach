import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LS_WEBHOOK_SECRET!;
  const hmac = Buffer.from(crypto.createHmac("sha256", secret).update(body).digest("hex"));
  const given = Buffer.from(signature);
  // timingSafeEqual throws on different lengths; a missing or wrong-length signature should be a clean 400
  return given.length === hmac.length && crypto.timingSafeEqual(hmac, given);
}

const PLAN_BY_VARIANT: Record<string, string> = {
  [process.env.LS_STARTER_VARIANT_ID!]: "starter",
  [process.env.LS_PRO_VARIANT_ID!]: "pro",
  [process.env.LS_BUSINESS_VARIANT_ID!]: "business",
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);
  const eventName: string = event.meta?.event_name;
  const attrs = event.data?.attributes;

  if (eventName === "subscription_created" || eventName === "order_created") {
    const userId = event.meta?.custom_data?.user_id;
    const variantId = String(attrs?.variant_id ?? attrs?.first_order_item?.variant_id ?? "");
    const plan = PLAN_BY_VARIANT[variantId];
    // An order's id is not the subscription's id. Only subscription_created may store it,
    // or a late order_created would overwrite it and cancellations would never match this user.
    const update: { plan: string; stripe_subscription_id?: string } = { plan };
    if (eventName === "subscription_created") update.stripe_subscription_id = String(event.data?.id ?? "");

    if (userId && plan) {
      await getSupabaseAdmin().from("users").update(update).eq("id", userId);
    }
  }

  if (eventName === "subscription_updated") {
    const subscriptionId = String(event.data?.id ?? "");
    const variantId = String(attrs?.variant_id ?? "");
    const status: string = attrs?.status ?? "";
    const plan = status === "active" ? (PLAN_BY_VARIANT[variantId] ?? "free") : "free";

    await getSupabaseAdmin()
      .from("users")
      .update({ plan })
      .eq("stripe_subscription_id", subscriptionId);
  }

  if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
    const subscriptionId = String(event.data?.id ?? "");
    await getSupabaseAdmin()
      .from("users")
      .update({ plan: "free", stripe_subscription_id: null })
      .eq("stripe_subscription_id", subscriptionId);
  }

  return NextResponse.json({ received: true });
}
