import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { dodo, planForProduct } from "@/lib/dodo";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
  };

  let event;
  try {
    event = dodo().webhooks.unwrap(body, { headers }); // throws on a bad signature or stale timestamp
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const sub = event.data as { subscription_id?: string; product_id?: string; metadata?: Record<string, string> };
  const subscriptionId = sub.subscription_id;
  if (!subscriptionId) return NextResponse.json({ received: true });

  switch (event.type) {
    case "subscription.active": {
      const plan = planForProduct(sub.product_id ?? "");
      const userId = sub.metadata?.user_id;
      if (plan && userId) {
        await db.from("users").update({ plan, stripe_subscription_id: subscriptionId }).eq("id", userId);
      }
      break;
    }
    case "subscription.plan_changed": {
      const plan = planForProduct(sub.product_id ?? "");
      if (plan) await db.from("users").update({ plan }).eq("stripe_subscription_id", subscriptionId);
      break;
    }
    case "subscription.cancelled":
    case "subscription.expired":
    case "subscription.failed":
    case "subscription.on_hold":
      await db.from("users").update({ plan: "free", stripe_subscription_id: null }).eq("stripe_subscription_id", subscriptionId);
      break;
  }

  return NextResponse.json({ received: true });
}
