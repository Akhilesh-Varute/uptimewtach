import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { dodo, planForProduct } from "@/lib/dodo";
import { enforcePlanLimits } from "@/lib/plan";

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
  const sub = event.data as { customer?: { customer_id?: string }; subscription_id?: string; product_id?: string; metadata?: Record<string, string> };
  const subscriptionId = sub.subscription_id;
  if (!subscriptionId) return NextResponse.json({ received: true });

  switch (event.type) {
    case "subscription.active": {
      const plan = planForProduct(sub.product_id ?? "");
      const userId = sub.metadata?.user_id;
      if (!plan) break;
      // Reactivation after on_hold may arrive without our metadata: fall back to the stored subscription id.
      const customerId = sub.customer?.customer_id;
      const query = db.from("users").update({ plan, stripe_subscription_id: subscriptionId, ...(customerId && { stripe_customer_id: customerId }) });
      await (userId ? query.eq("id", userId) : query.eq("stripe_subscription_id", subscriptionId));
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
    case "subscription.on_hold": {
      // on_hold can be reactivated, so keep the subscription id then; otherwise the later
      // subscription.active could not find this user if it arrives without our metadata.
      const ended = event.type !== "subscription.on_hold";
      const { data: user } = await db
        .from("users").update(ended ? { plan: "free", stripe_subscription_id: null } : { plan: "free" })
        .eq("stripe_subscription_id", subscriptionId).select("id").single();
      if (user) await enforcePlanLimits(user.id, "free");
      break;
    }
  }

  return NextResponse.json({ received: true });
}
