import { NextRequest, NextResponse } from "next/server";
import * as tls from "tls";

// Debug-only endpoint — remove before shipping to customers
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Pass ?url=https://example.com" }, { status: 400 });

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const result = await new Promise<Record<string, unknown>>((resolve) => {
    let settled = false;
    const done = (r: Record<string, unknown>) => { if (!settled) { settled = true; resolve(r); } };

    const timer = setTimeout(() => { socket.destroy(); done({ error: "timeout" }); }, 10000);

    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false },
      () => {
        clearTimeout(timer);
        const cert = socket.getPeerCertificate(true);
        socket.destroy();
        done({
          authorized: socket.authorized,
          authorizationError: socket.authorizationError?.message ?? null,
          valid_from: cert?.valid_from,
          valid_to: cert?.valid_to,
          issuer: cert?.issuer,
          subject: cert?.subject,
          subjectaltname: cert?.subjectaltname,
          fingerprint: cert?.fingerprint,
          certIsEmpty: !cert || Object.keys(cert).length === 0,
        });
      }
    );
    socket.on("error", (e) => { clearTimeout(timer); done({ error: e.message, code: (e as NodeJS.ErrnoException).code }); });
  });

  return NextResponse.json({ hostname, ...result });
}
