import { getSupabaseAdmin } from "@/lib/supabase";
import { PLAN_LIMITS } from "@/lib/utils";

/**
 * After a downgrade: keep the oldest monitors up to the plan limit running at the plan's interval,
 * and pause the rest (their history and settings stay, so an upgrade can resume them).
 */
export async function enforcePlanLimits(userId: string, plan: keyof typeof PLAN_LIMITS) {
  const db = getSupabaseAdmin();
  const limits = PLAN_LIMITS[plan];
  const { data: monitors } = await db
    .from("monitors").select("id").eq("user_id", userId).order("created_at", { ascending: true });
  const ids = (monitors ?? []).map((m) => m.id);

  const keep = ids.slice(0, limits.monitors);
  const pause = ids.slice(limits.monitors);
  if (keep.length) await db.from("monitors").update({ interval_seconds: limits.interval }).in("id", keep).lt("interval_seconds", limits.interval);
  if (pause.length) await db.from("monitors").update({ is_active: false }).in("id", pause);
}
