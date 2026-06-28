import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { sendDownAlert, sendUpAlert, sendSslExpiryAlert } from "@/lib/email";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

  const downtimeStart = new Date(Date.now() - 14 * 60 * 1000 - 32 * 1000).toISOString();

  await sendDownAlert(email, "api.myapp.com", "https://api.myapp.com/health", {
    statusCode: 503,
    errorMessage: "connect ECONNREFUSED 104.21.18.45:443",
    responseTimeMs: 8431,
  });

  await sendUpAlert(email, "api.myapp.com", "https://api.myapp.com/health", {
    downtimeStartedAt: downtimeStart,
    responseTimeMs: 142,
  });

  await sendSslExpiryAlert(email, "api.myapp.com", "https://api.myapp.com", 6, {
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    issuer: "Let's Encrypt",
  });

  return NextResponse.json({ ok: true, sent_to: email, emails: ["down", "up", "ssl-critical"] });
}
