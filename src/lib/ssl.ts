import * as tls from "tls";

export type SslResult = {
  expiresAt: Date | null;
  daysRemaining: number | null;
  issuer: string | null;
  error: string | null;
};

export async function checkSslCert(url: string): Promise<SslResult> {
  let hostname: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return { expiresAt: null, daysRemaining: null, issuer: null, error: "not-https" };
    }
    hostname = parsed.hostname;
  } catch {
    return { expiresAt: null, daysRemaining: null, issuer: null, error: "invalid-url" };
  }

  return new Promise((resolve) => {
    let settled = false;
    function done(result: SslResult) {
      if (settled) return;
      settled = true;
      resolve(result);
    }

    const timer = setTimeout(() => {
      socket.destroy();
      done({ expiresAt: null, daysRemaining: null, issuer: null, error: "timeout" });
    }, 10000);

    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,       // SNI — required for CDNs and virtual hosting
        rejectUnauthorized: false,  // get cert even if expired or self-signed
      },
      () => {
        clearTimeout(timer);
        try {
          // true = detailed cert with full chain; needed for CDN-fronted sites
          const cert = socket.getPeerCertificate(true);
          socket.destroy();

          // cert can be an empty object {} if the TLS lib didn't capture it
          const validTo = cert?.valid_to;
          if (!validTo) {
            done({ expiresAt: null, daysRemaining: null, issuer: null, error: "no-cert" });
            return;
          }

          // Node returns dates like "Sep 30 00:00:00 2025 GMT"
          const expiresAt = new Date(validTo);
          if (isNaN(expiresAt.getTime())) {
            done({ expiresAt: null, daysRemaining: null, issuer: null, error: "invalid-date" });
            return;
          }

          const daysRemaining = Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000);
          const issuer = (cert.issuer as Record<string, string>)?.O ?? null;
          done({ expiresAt, daysRemaining, issuer, error: null });
        } catch (_) {
          socket.destroy();
          done({ expiresAt: null, daysRemaining: null, issuer: null, error: "parse-error" });
        }
      }
    );

    socket.on("error", (err) => {
      clearTimeout(timer);
      done({ expiresAt: null, daysRemaining: null, issuer: null, error: err.message });
    });

    // Also catch if secureConnect fires but the callback doesn't (some Node versions)
    socket.on("secureConnect", () => {
      // Already handled in the connect callback — no-op here
    });
  });
}

export function getSslAlertThreshold(daysRemaining: number): number | null {
  if (daysRemaining <= 7) return 7;
  if (daysRemaining <= 14) return 14;
  if (daysRemaining <= 30) return 30;
  return null;
}
