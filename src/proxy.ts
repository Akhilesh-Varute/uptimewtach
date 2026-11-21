import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/status/(.*)",
  "/status-domain(.*)",
  "/api/cron",
  "/api/cron/(.*)",
  "/api/webhooks(.*)",
  "/api/status-pages/(.*)",
  "/api/heartbeat/(.*)",
  "/api/badge/(.*)",
  // API-key and agent routes authenticate themselves; the session check would 404 them
  "/api/v1/monitors(.*)",
  "/api/v1/incidents(.*)",
  "/api/mcp(.*)",
  "/llms.txt",
  "/freshping-alternative",
  "/uptimerobot-alternative",
  "/privacy",
  "/terms",
  "/sitemap.xml",
  "/pricing(.*)",
]);

export const proxy = clerkMiddleware(async (auth, req: NextRequest) => {
  const host = req.headers.get("host") ?? "";

  // Rewrite custom domains to /status-domain?host=...
  const appHostname = process.env.NEXT_PUBLIC_APP_HOSTNAME ?? "";
  const isOwnHost =
    !host ||
    host.startsWith("localhost") ||
    host.endsWith(".vercel.app") ||
    (appHostname !== "" && host === appHostname);

  if (!isOwnHost) {
    const url = req.nextUrl.clone();
    url.pathname = "/status-domain";
    url.searchParams.set("host", host);
    return NextResponse.rewrite(url);
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
