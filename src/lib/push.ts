import { setVapidDetails, sendNotification } from "web-push";
import { getSupabaseAdmin } from "./supabase";

let ready = false;
function init() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!ready) {
    setVapidDetails(process.env.VAPID_SUBJECT ?? "https://uptimewatch.akhileshvarute.me", pub, priv);
    ready = true;
  }
  return true;
}

/** Sends a browser notification to every device the user enabled. Never throws: alerts must not break monitoring. */
export async function sendPush(userId: string, msg: { title: string; body: string }) {
  try {
    if (!init()) return;
    const db = getSupabaseAdmin();
    const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(msg),
          { TTL: 3600, urgency: "high" }
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id); // device unsubscribed
      }
    }));
  } catch {
    // ignore
  }
}
