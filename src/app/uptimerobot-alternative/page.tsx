import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { MarketingNav, MarketingFooter } from "../marketing-chrome";


export const metadata: Metadata = {
  title: "Best UptimeRobot Alternative 2026 — Simple & Affordable | UptimeWatch",
  description: "UptimeRobot restricted its free plan to non-commercial use in December 2024. UptimeWatch offers free uptime monitoring for businesses with public status pages.",
};

export default async function UptimeRobotAlternativePage() {
  const { userId } = await auth();
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <MarketingNav signedIn={!!userId} />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">Best UptimeRobot alternative in 2026</h1>
        <p className="text-xl text-gray-400 mb-4">
          UptimeRobot restricted its free plan to non-commercial use in December 2024. Commercial SaaS businesses now need a paid plan starting at $7/month for just 10 monitors.
        </p>
        <p className="text-gray-400 mb-8">
          UptimeWatch gives you 10 monitors free with no commercial restrictions, public status pages, and clean email alerts — without the complexity.
        </p>

        <Link href="/sign-up" className="inline-block bg-accent hover:bg-accent/90 text-accent-ink px-8 py-3 rounded-lg font-semibold mb-16">
          Switch to UptimeWatch — free →
        </Link>

        <h2 className="text-2xl font-bold mb-6">UptimeRobot vs UptimeWatch</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Feature</th>
                <th className="px-4 py-3 text-gray-500 font-medium">UptimeRobot</th>
                <th className="px-4 py-3 text-blue-400 font-medium">UptimeWatch</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Free for commercial use", "❌ No", "✅ Yes"],
                ["Free monitors", "0 (commercial)", "10"],
                ["Starter price", "$7/mo (10 monitors)", "$19/mo (20 monitors)"],
                ["Public status pages", "Paid only", "✅ Free (1 page)"],
                ["Email alerts", "✅", "✅"],
                ["Response time graphs", "✅", "✅"],
                ["1-min check interval", "Paid only", "Starter ($19/mo)"],
              ].map(([feature, ur, uw]) => (
                <tr key={feature} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-3 text-gray-300">{feature}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{ur}</td>
                  <td className="px-4 py-3 text-center">{uw}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 mb-12">
          {[
            { q: "Can I use UptimeWatch for commercial projects?", a: "Yes. All plans including the free plan can be used for commercial websites, SaaS products, and business applications." },
            { q: "How many monitors do I get for free?", a: "10 monitors with 5-minute checks and 1 public status page, forever free." },
            { q: "Is UptimeWatch cheaper than UptimeRobot for growing teams?", a: "At $19/month for 20 monitors (vs UptimeRobot's $7/month for just 10 monitors), UptimeWatch gives you more monitors per dollar at scale." },
          ].map(({ q, a }) => (
            <div key={q} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold mb-2">{q}</h3>
              <p className="text-gray-400 text-sm">{a}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/sign-up" className="bg-accent hover:bg-accent/90 text-accent-ink px-8 py-3 rounded-lg font-semibold">
            Start monitoring for free →
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
