import { NextRequest, NextResponse } from "next/server";
import { runChecks } from "@/lib/monitoring";

// Called every minute by cron-job.org (free) or Vercel Cron
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const xSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (xSecret !== cronSecret && bearerSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runChecks();
    return NextResponse.json({ ok: true, ran_at: new Date().toISOString() });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
