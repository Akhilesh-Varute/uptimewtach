"use client";

import { useState } from "react";
import Link from "next/link";

type Props = { name: string; cta: string; href: string; signedIn: boolean; className: string };

/** Signed-out visitors go to sign-up. Signed-in users go straight to checkout (paid plans) or the dashboard (Free). */
export default function PlanButton({ name, cta, href, signedIn, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!signedIn) return <Link href={href} className={className}>{cta}</Link>;
  if (name === "Free") return <Link href="/dashboard" className={className}>Go to dashboard</Link>;

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: name.toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) { window.location.href = data.url; return; }
      setError(data.error || "Could not start checkout. Please try again.");
    } catch {
      setError("Could not start checkout. Please try again.");
    }
    setLoading(false);
  }

  return (
    <>
      <button type="button" onClick={checkout} disabled={loading} className={className}>
        {loading ? "Starting checkout…" : "Upgrade"}
      </button>
      {error && <p role="alert" style={{ color: "var(--color-danger, #f87171)", fontSize: "0.85rem", marginTop: "0.5rem" }}>{error}</p>}
    </>
  );
}
