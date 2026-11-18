"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyToBytes(b64: string) {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function PushToggle() {
  const [supported, setSupported] = useState(true);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !PUBLIC_KEY) { setSupported(false); return; }
    navigator.serviceWorker.register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setOn(!!sub))
      .catch(() => setSupported(false));
  }, []);

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: existing.endpoint }) });
        await existing.unsubscribe();
        setOn(false);
        return;
      }
      if ((await Notification.requestPermission()) !== "granted") {
        setError("Notifications are blocked. Allow them for this site in your browser settings.");
        return;
      }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUBLIC_KEY) });
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) { await sub.unsubscribe(); setError("Could not save this device. Please try again."); return; }
      setOn(true);
    } catch {
      setError("Could not change notification settings. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Browser notifications</h2>
          <p className="text-gray-400 text-sm">Get a popup on this device when a monitor goes down or recovers, even with the tab closed.</p>
        </div>
        <button onClick={toggle} disabled={busy} className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-accent-ink px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 shrink-0">
          {busy ? <Loader2 size={15} className="motion-safe:animate-spin" /> : on ? <BellOff size={15} /> : <Bell size={15} />}
          {on ? "Turn off" : "Turn on"}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
