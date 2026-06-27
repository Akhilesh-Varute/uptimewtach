import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { sendDownAlert, sendUpAlert } from "@/lib/email";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

  await sendDownAlert(email, "Test Monitor", "https://example.com");
  await sendUpAlert(email, "Test Monitor", "https://example.com");

  return NextResponse.json({ ok: true, sent_to: email });
}
