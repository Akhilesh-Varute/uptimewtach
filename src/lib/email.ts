import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM
  ? "UptimeWatch <" + process.env.EMAIL_FROM + ">"
  : "UptimeWatch <alerts@uptimewatch.io>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://uptimewatch.io";

function pill(label: string): string {
  return `<span style="display:inline-block;padding:3px 12px;background:rgba(255,255,255,0.18);color:#ffffff;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;border:1px solid rgba(255,255,255,0.28)">${label}</span>`;
}

function metaRow(icon: string, label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #2d3748;vertical-align:top;white-space:nowrap">
      <span style="color:#4a5568;font-size:13px">${icon}&nbsp;${label}</span>
    </td>
    <td style="padding:10px 0 10px 16px;border-bottom:1px solid #2d3748;text-align:right;vertical-align:top">
      <span style="color:#e2e8f0;font-size:13px;font-weight:500;word-break:break-all">${value}</span>
    </td>
  </tr>`;
}

function cta(text: string, href: string, bg: string): string {
  return `<a href="${href}" style="display:inline-block;padding:13px 32px;background:${bg};color:#ffffff;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">${text}</a>`;
}

function formatInterval(seconds: number): string {
  if (seconds < 60) return seconds + " seconds";
  const mins = Math.round(seconds / 60);
  return mins === 1 ? "1 minute" : mins + " minutes";
}

function base(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>UptimeWatch</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">

        <tr><td style="padding-bottom:24px;text-align:center">
          <span style="display:inline-flex;align-items:center;gap:8px">
            <span style="width:8px;height:8px;border-radius:50%;background:#3b82f6;display:inline-block"></span>
            <span style="color:#e2e8f0;font-size:15px;font-weight:700;letter-spacing:-0.3px">UptimeWatch</span>
          </span>
        </td></tr>

        <tr><td style="background:#1a1f2e;border:1px solid #2d3748;border-radius:16px;overflow:hidden">
          ${body}
        </td></tr>

        <tr><td style="padding-top:20px;text-align:center">
          <p style="margin:0;color:#4a5568;font-size:12px;line-height:1.8">
            Sent by <a href="${APP_URL}" style="color:#4a5568;text-decoration:underline">UptimeWatch</a>
            &nbsp;&middot;&nbsp;
            <a href="${APP_URL}/dashboard" style="color:#4a5568;text-decoration:underline">Manage alert settings</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// DOWN ALERT
export async function sendDownAlert(
  to: string,
  monitorName: string,
  url: string,
  opts?: {
    statusCode?: number | null;
    errorMessage?: string | null;
    responseTimeMs?: number | null;
    intervalSeconds?: number | null;
  }
) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }) + " UTC";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  const intervalLabel = opts?.intervalSeconds ? formatInterval(opts.intervalSeconds) : "a few minutes";

  const errorBlock = opts?.errorMessage
    ? `<tr><td colspan="2" style="padding:10px 0;border-bottom:1px solid #2d3748">
        <div style="color:#4a5568;font-size:12px;margin-bottom:4px">Error</div>
        <div style="background:#0f1117;border:1px solid #374151;border-radius:6px;padding:10px 12px">
          <code style="color:#fc8181;font-size:12px;font-family:monospace">${opts.errorMessage}</code>
        </div>
      </td></tr>`
    : "";

  const body = `
    <tr><td style="background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:28px 32px 24px">
      <div style="margin-bottom:12px">${pill("Incident")}</div>
      <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px">Your monitor is down</h1>
      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px">${dateStr} &middot; ${timeStr}</p>
    </td></tr>

    <tr><td style="padding:28px 32px">

      <div style="background:#0f1117;border:1px solid #374151;border-left:3px solid #ef4444;border-radius:8px;padding:14px 18px;margin-bottom:24px">
        <div style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Affected monitor</div>
        <div style="color:#f9fafb;font-size:17px;font-weight:700">${monitorName}</div>
        <div style="color:#6b7280;font-size:12px;margin-top:3px;word-break:break-all">${url}</div>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0">
        ${metaRow("&#128308;", "Status", "Down")}
        ${opts?.statusCode ? metaRow("&#128225;", "HTTP status", String(opts.statusCode)) : ""}
        ${opts?.responseTimeMs != null ? metaRow("&#9201;", "Response time", opts.responseTimeMs + " ms") : ""}
        ${metaRow("&#128336;", "Detected at", timeStr)}
        ${errorBlock}
      </table>

      <div style="margin-top:24px;background:#111827;border:1px solid #1f2937;border-radius:8px;padding:16px 18px">
        <div style="color:#9ca3af;font-size:12px;font-weight:600;margin-bottom:8px">WHAT HAPPENS NEXT</div>
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7">
          UptimeWatch will keep checking every <strong style="color:#9ca3af">${intervalLabel}</strong>.
          Once <strong style="color:#9ca3af">${monitorName}</strong> comes back online,
          you'll get an automatic recovery email with the total downtime duration.
        </p>
      </div>

      <div style="text-align:center;margin-top:28px">
        ${cta("View Monitor &rarr;", APP_URL + "/dashboard", "#dc2626")}
      </div>

    </td></tr>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "🔴 [Down] " + monitorName + " is not responding",
    html: base(body),
  });
}

// UP / RECOVERY ALERT
export async function sendUpAlert(
  to: string,
  monitorName: string,
  url: string,
  opts?: { downtimeStartedAt?: string | null; responseTimeMs?: number | null }
) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }) + " UTC";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

  let durationStr = "";
  if (opts?.downtimeStartedAt) {
    const ms = now.getTime() - new Date(opts.downtimeStartedAt).getTime();
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    durationStr = h > 0 ? (h + "h " + m + "m") : m > 0 ? (m + "m " + s + "s") : (s + "s");
  }

  const body = `
    <tr><td style="background:linear-gradient(135deg,#064e3b,#065f46);padding:28px 32px 24px">
      <div style="margin-bottom:12px">${pill("Recovered")}</div>
      <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px">Your monitor is back up</h1>
      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px">${dateStr} &middot; ${timeStr}</p>
    </td></tr>

    <tr><td style="padding:28px 32px">

      <div style="background:#0f1117;border:1px solid #374151;border-left:3px solid #10b981;border-radius:8px;padding:14px 18px;margin-bottom:24px">
        <div style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Recovered monitor</div>
        <div style="color:#f9fafb;font-size:17px;font-weight:700">${monitorName}</div>
        <div style="color:#6b7280;font-size:12px;margin-top:3px;word-break:break-all">${url}</div>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0">
        ${metaRow("&#128994;", "Status", "Operational")}
        ${metaRow("&#128336;", "Recovered at", timeStr)}
        ${durationStr ? metaRow("&#9201;", "Total downtime", durationStr) : ""}
        ${opts?.responseTimeMs != null ? metaRow("&#128225;", "Response time", opts.responseTimeMs + " ms") : ""}
      </table>

      <div style="margin-top:24px;background:#022c22;border:1px solid #064e3b;border-radius:8px;padding:16px 18px;text-align:center">
        <div style="font-size:28px;margin-bottom:8px">&#10003;</div>
        <p style="margin:0;color:#6ee7b7;font-size:14px;font-weight:500">All systems operational &mdash; no further action needed.</p>
      </div>

      <div style="text-align:center;margin-top:28px">
        ${cta("View Uptime History &rarr;", APP_URL + "/dashboard", "#059669")}
      </div>

    </td></tr>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "✅ [Recovered] " + monitorName + " is back online" + (durationStr ? " after " + durationStr : ""),
    html: base(body),
  });
}

// SSL EXPIRY ALERT
export async function sendSslExpiryAlert(
  to: string,
  monitorName: string,
  url: string,
  daysRemaining: number,
  opts?: { expiresAt?: Date | null; issuer?: string | null }
) {
  const isCritical = daysRemaining <= 7;
  const isWarning = daysRemaining <= 14;
  const urgency = isCritical ? "CRITICAL" : isWarning ? "WARNING" : "NOTICE";
  const accentColor = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#3b82f6";
  const headerBg = isCritical
    ? "linear-gradient(135deg,#7f1d1d,#991b1b)"
    : isWarning
    ? "linear-gradient(135deg,#78350f,#92400e)"
    : "linear-gradient(135deg,#1e3a5f,#1e40af)";
  const emoji = isCritical ? "🚨" : isWarning ? "⚠️" : "🔔";

  const expiryDateStr = opts?.expiresAt
    ? opts.expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const urgencyMsg = isCritical
    ? "Your SSL certificate expires in <strong style='color:#fca5a5'>" + daysRemaining + " days</strong>. Visitors will see security warnings immediately after expiry."
    : isWarning
    ? "Your SSL certificate expires soon. Renew now to avoid downtime and browser security warnings."
    : "Your SSL certificate will expire in " + daysRemaining + " days. Plan your renewal in advance.";

  const body = `
    <tr><td style="background:${headerBg};padding:28px 32px 24px">
      <div style="margin-bottom:12px">${pill(urgency)}</div>
      <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px">SSL Certificate Expiring</h1>
      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px">${monitorName}</p>
    </td></tr>

    <tr><td style="padding:28px 32px">

      <div style="text-align:center;margin-bottom:28px;background:#0f1117;border:1px solid #2d3748;border-radius:12px;padding:24px">
        <div style="font-size:56px;font-weight:900;color:${accentColor};line-height:1;letter-spacing:-2px">${daysRemaining}</div>
        <div style="color:#9ca3af;font-size:14px;margin-top:6px;font-weight:500">days until expiry</div>
        ${expiryDateStr ? "<div style=\"color:#6b7280;font-size:12px;margin-top:4px\">Expires " + expiryDateStr + "</div>" : ""}
      </div>

      <div style="background:#0f1117;border:1px solid #374151;border-left:3px solid ${accentColor};border-radius:8px;padding:14px 18px;margin-bottom:24px">
        <div style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Monitor</div>
        <div style="color:#f9fafb;font-size:16px;font-weight:700">${monitorName}</div>
        <div style="color:#6b7280;font-size:12px;margin-top:3px;word-break:break-all">${url}</div>
        ${opts?.issuer ? "<div style=\"color:#6b7280;font-size:12px;margin-top:4px\">Issued by: " + opts.issuer + "</div>" : ""}
      </div>

      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;line-height:1.7">${urgencyMsg}</p>

      <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:18px 20px;margin-bottom:28px">
        <div style="color:#e2e8f0;font-size:13px;font-weight:600;margin-bottom:12px">HOW TO RENEW</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:28px;vertical-align:top;padding:4px 0">
              <span style="display:inline-block;width:20px;height:20px;background:${accentColor};color:#fff;border-radius:50%;font-size:11px;font-weight:700;text-align:center;line-height:20px">1</span>
            </td>
            <td style="padding:4px 0 4px 10px;color:#9ca3af;font-size:13px;line-height:1.5">Log in to your hosting or domain provider (Cloudflare, Namecheap, cPanel, etc.)</td>
          </tr>
          <tr>
            <td style="width:28px;vertical-align:top;padding:4px 0">
              <span style="display:inline-block;width:20px;height:20px;background:${accentColor};color:#fff;border-radius:50%;font-size:11px;font-weight:700;text-align:center;line-height:20px">2</span>
            </td>
            <td style="padding:4px 0 4px 10px;color:#9ca3af;font-size:13px;line-height:1.5">Renew or re-issue the SSL certificate for <strong style="color:#e2e8f0">${url}</strong></td>
          </tr>
          <tr>
            <td style="width:28px;vertical-align:top;padding:4px 0">
              <span style="display:inline-block;width:20px;height:20px;background:${accentColor};color:#fff;border-radius:50%;font-size:11px;font-weight:700;text-align:center;line-height:20px">3</span>
            </td>
            <td style="padding:4px 0 4px 10px;color:#9ca3af;font-size:13px;line-height:1.5">UptimeWatch will detect the new cert automatically on the next check</td>
          </tr>
        </table>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #1f2937">
          <p style="margin:0;color:#6b7280;font-size:12px">Tip: If you use Let's Encrypt, enable auto-renewal via Certbot or your hosting panel to avoid this in the future.</p>
        </div>
      </div>

      <div style="text-align:center">
        ${cta("View SSL Details &rarr;", APP_URL + "/dashboard", accentColor)}
      </div>

    </td></tr>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: emoji + " [SSL " + urgency + "] " + monitorName + " expires in " + daysRemaining + " days",
    html: base(body),
  });
}
