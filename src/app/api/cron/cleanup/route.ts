import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PLAN_LIMITS } from "@/lib/utils";

// Prune monitor_checks and incidents older than each user's plan history window.
// Call daily from cron-job.org at 03:00 UTC targeting /api/cron/cleanup
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const xSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (xSecret !== cronSecret && bearerSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: users } = await getSupabaseAdmin().from("users").select("id, plan");
  if (!users) return NextResponse.json({ ok: true, pruned: 0 });

  let totalPruned = 0;

  for (const user of users) {
    const historyDays = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS]?.historyDays ?? 7;
    const cutoff = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: monitors } = await getSupabaseAdmin()
      .from("monitors").select("id").eq("user_id", user.id);
    if (!monitors?.length) continue;

    const monitorIds = monitors.map((m: { id: string }) => m.id);

    const { count: c1 } = await getSupabaseAdmin()
      .from("monitor_checks")
      .delete({ count: "exact" })
      .in("monitor_id", monitorIds)
      .lt("checked_at", cutoff);

    const { count: c2 } = await getSupabaseAdmin()
      .from("incidents")
      .delete({ count: "exact" })
      .in("monitor_id", monitorIds)
      .lt("started_at", cutoff)
      .eq("status", "resolved");

    totalPruned += (c1 ?? 0) + (c2 ?? 0);
  }

  return NextResponse.json({ ok: true, pruned: totalPruned, ran_at: new Date().toISOString() });
}
