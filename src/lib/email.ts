import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "alerts@uptimewatch.io";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://uptimewatch.io";

export async function sendDownAlert(to: string, monitorName: string, url: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `🔴 ${monitorName} is DOWN`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#ef4444">🔴 ${monitorName} is DOWN</h2>
        <p>Your monitor detected that <strong>${url}</strong> is not responding.</p>
        <p style="color:#6b7280;font-size:14px">Time: ${new Date().toUTCString()}</p>
        <a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#3b82f6;color:white;border-radius:6px;text-decoration:none">
          View Dashboard
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          UptimeWatch · <a href="${APP_URL}/dashboard" style="color:#9ca3af">Manage alerts</a>
        </p>
      </div>
    `,
  });
}

export async function sendUpAlert(to: string, monitorName: string, url: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `✅ ${monitorName} is back UP`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#22c55e">✅ ${monitorName} is back UP</h2>
        <p><strong>${url}</strong> is responding normally again.</p>
        <p style="color:#6b7280;font-size:14px">Time: ${new Date().toUTCString()}</p>
        <a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#3b82f6;color:white;border-radius:6px;text-decoration:none">
          View Dashboard
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          UptimeWatch · <a href="${APP_URL}/dashboard" style="color:#9ca3af">Manage alerts</a>
        </p>
      </div>
    `,
  });
}
