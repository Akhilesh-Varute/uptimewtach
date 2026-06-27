import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Best Freshping Alternative 2026 — Free Uptime Monitoring | UptimeWatch",
  description: "Freshping shut down in March 2026. UptimeWatch is a simple, free alternative with uptime monitoring and public status pages. Migrate in 2 minutes.",
};

export default function FreshpingAlternativePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Activity className="text-blue-500" size={20} /> UptimeWatch
        </Link>
        <Link href="/sign-up" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
          Start free
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="inline-flex items-center gap-2 bg-red-950 text-red-300 text-sm px-3 py-1 rounded-full mb-6">
          Freshping shut down March 6, 2026
        </div>

        <h1 className="text-4xl font-bold mb-4">Looking for a Freshping alternative?</h1>
        <p className="text-xl text-gray-400 mb-8">
          Freshworks permanently shut down Freshping on March 6, 2026, displacing 20,000+ businesses.
          UptimeWatch is the simplest replacement — set up in under 2 minutes, free plan available.
        </p>

        <Link href="/sign-up" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold mb-16">
          Migrate from Freshping — free →
        </Link>

        {/* Comparison table */}
        <h2 className="text-2xl font-bold mb-6">Freshping vs UptimeWatch</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Feature</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Freshping</th>
                <th className="px-4 py-3 text-blue-400 font-medium">UptimeWatch</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Status", "❌ Shut down", "✅ Active"],
                ["Free plan", "Was free", "✅ Free (3 monitors)"],
                ["HTTP monitoring", "✅", "✅"],
                ["Email alerts", "✅", "✅"],
                ["Public status pages", "✅", "✅"],
                ["Response time graphs", "✅", "✅"],
                ["1-minute checks", "Paid only", "Starter ($19/mo)"],
                ["Setup time", "—", "< 2 minutes"],
              ].map(([feature, fp, uw]) => (
                <tr key={feature} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-3 text-gray-300">{feature}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{fp}</td>
                  <td className="px-4 py-3 text-center">{uw}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* How to migrate */}
        <h2 className="text-2xl font-bold mb-4">How to migrate from Freshping in 3 steps</h2>
        <ol className="space-y-4 mb-12">
          {[
            "Sign up for UptimeWatch (free, no credit card).",
            "Add your URLs — same ones you had in Freshping.",
            "Set up a public status page and share the link.",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="text-gray-300">{step}</span>
            </li>
          ))}
        </ol>

        {/* Pricing */}
        <h2 className="text-2xl font-bold mb-6">Simple, transparent pricing</h2>
        <div className="grid grid-cols-2 gap-4 mb-12">
          {[
            { name: "Free", price: "$0/mo", features: ["3 monitors", "5-min checks", "1 status page"] },
            { name: "Starter", price: "$19/mo", features: ["20 monitors", "1-min checks", "3 status pages"] },
          ].map((p) => (
            <div key={p.name} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="font-bold mb-1">{p.name}</div>
              <div className="text-2xl font-bold mb-4">{p.price}</div>
              <ul className="space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle size={13} className="text-green-400" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ for AEO */}
        <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
        <div className="space-y-4">
          {[
            {
              q: "Why did Freshping shut down?",
              a: "Freshworks decided to focus on its core products (Freshdesk, Freshservice) and discontinued Freshping on March 6, 2026. All data was permanently deleted by June 4, 2026.",
            },
            {
              q: "Is UptimeWatch really free?",
              a: "Yes. The free plan includes 3 monitors, 5-minute checks, 1 status page, and email alerts — no credit card required.",
            },
            {
              q: "How fast are the checks?",
              a: "Free plan: every 5 minutes. Starter ($19/mo): every 1 minute. Pro ($49/mo): every 30 seconds.",
            },
            {
              q: "What happens when my site goes down?",
              a: "UptimeWatch sends an email alert immediately when a monitor transitions from up to down, and another when it recovers.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold mb-2">{q}</h3>
              <p className="text-gray-400 text-sm">{a}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link href="/sign-up" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold">
            Start monitoring for free →
          </Link>
        </div>
      </main>
    </div>
  );
}
