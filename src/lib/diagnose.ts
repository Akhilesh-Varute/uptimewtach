// Turns a failed check into a plain-English cause, using only what an outside check can see.
// No AI call: these rules cover the common failures for free and never invent a cause.

export type Evidence = {
  statusCode: number | null;
  errorMessage: string | null;
  responseTimeMs?: number | null;
  sslDaysRemaining?: number | null;
  lastUpAt?: string | null; // last successful check
  typicalMs?: number | null; // average response time of recent successful checks
  regions?: string | null; // e.g. "Confirmed down from all 3 regions."
};

export type Diagnosis = { cause: string; detail: string; nextStep: string };

const has = (msg: string, ...needles: string[]) => needles.some((n) => msg.includes(n));

export function diagnose(e: Evidence): Diagnosis {
  const msg = (e.errorMessage ?? "").toLowerCase();
  const code = e.statusCode;

  let d: Diagnosis;
  if (has(msg, "enotfound", "eai_again", "getaddrinfo")) {
    d = { cause: "DNS lookup failed", detail: "The domain name did not resolve to an address.", nextStep: "Check your DNS records and that the domain has not expired." };
  } else if (has(msg, "certificate has expired", "cert_has_expired") || (e.sslDaysRemaining != null && e.sslDaysRemaining < 0)) {
    d = { cause: "SSL certificate expired", detail: "Browsers will refuse to load the site.", nextStep: "Renew the certificate (or fix auto-renewal)." };
  } else if (has(msg, "certificate", "self-signed", "self signed", "altnames", "ssl", "tls")) {
    d = { cause: "SSL/TLS error", detail: "The secure connection failed: the certificate is invalid, incomplete or for another domain.", nextStep: "Check the certificate chain and that it covers this hostname." };
  } else if (has(msg, "econnrefused", "connection refused")) {
    d = { cause: "Connection refused", detail: "The server is reachable but nothing is accepting connections on that port: the app or web server is likely stopped.", nextStep: "Check that your app process / web server is running." };
  } else if (has(msg, "timeout", "etimedout", "timed out")) {
    d = { cause: "No response (timeout)", detail: "The server did not answer within 10 seconds: it may be overloaded, frozen or blocked by a firewall.", nextStep: "Check server load and firewall rules." };
  } else if (has(msg, "econnreset", "socket hang up")) {
    d = { cause: "Connection dropped", detail: "The server closed the connection mid-request: often a crash, restart or proxy problem.", nextStep: "Check app logs for crashes or restarts." };
  } else if (has(msg, "keyword")) {
    d = { cause: "Expected content missing", detail: "The page loaded, but the text you monitor for is not on it.", nextStep: "Check whether the page shows an error or changed after a deploy." };
  } else if (has(msg, "blocked: private")) {
    d = { cause: "Address not allowed", detail: "The URL resolves to a private or internal address, which we do not check.", nextStep: "Use a public URL." };
  } else if (code === 502 || code === 504) {
    d = { cause: `Gateway error (HTTP ${code})`, detail: "Your proxy or load balancer is up, but the app behind it is not answering.", nextStep: "Restart or check the upstream app." };
  } else if (code === 503) {
    d = { cause: "Service unavailable (HTTP 503)", detail: "The server says it is overloaded or in maintenance.", nextStep: "Check load or any maintenance mode." };
  } else if (code && code >= 500) {
    d = { cause: `Server error (HTTP ${code})`, detail: "The app is running but failing while handling requests.", nextStep: "Check app logs for the error." };
  } else if (code === 404) {
    d = { cause: "Page not found (HTTP 404)", detail: "The server answered, but this URL no longer exists.", nextStep: "Check routing or a recent deploy that moved the page." };
  } else if (code && code >= 400) {
    d = { cause: `Request rejected (HTTP ${code})`, detail: "The server refused the request.", nextStep: "Check the URL and access rules." };
  } else {
    d = { cause: "Check failed", detail: e.errorMessage ?? "The check failed without a specific error.", nextStep: "Open the site to confirm." };
  }

  // Context an outside check can add on top of the cause.
  const extras: string[] = [];
  if (e.regions) extras.push(e.regions);
  if (e.typicalMs && e.responseTimeMs && e.responseTimeMs > e.typicalMs * 3) {
    extras.push(`It answered in ${e.responseTimeMs} ms, about ${Math.round(e.responseTimeMs / e.typicalMs)}x slower than usual.`);
  }
  if (e.lastUpAt) extras.push(`Last successful check: ${new Date(e.lastUpAt).toUTCString()}.`);
  if (extras.length) d = { ...d, detail: `${d.detail} ${extras.join(" ")}` };
  return d;
}

/** One-line summary for push notifications, chat messages and incident records. */
export const summarize = (d: Diagnosis) => `${d.cause}. ${d.nextStep}`;
