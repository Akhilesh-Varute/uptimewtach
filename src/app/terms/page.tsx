import { auth } from "@clerk/nextjs/server";
import { MarketingNav, MarketingFooter } from "../marketing-chrome";

export const metadata = { title: "Terms of Service — UptimeWatch" };

export default async function TermsPage() {
  const { userId } = await auth();
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <MarketingNav signedIn={!!userId} />
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-4 text-sm leading-relaxed">
        <h1 className="text-3xl font-bold text-ink">Terms of Service</h1>
        <p>Last updated: November 2026</p>
        <h2 className="text-lg font-semibold text-ink pt-4">The service</h2>
        <p>UptimeWatch provides uptime monitoring, alerts and public status pages. Plan limits (monitors, check interval, history, features) are listed on the pricing page.</p>
        <h2 className="text-lg font-semibold text-ink pt-4">Acceptable use</h2>
        <p>Only monitor sites and servers you own or have permission to monitor. Do not use the service to attack, probe or overload third-party systems, or for anything unlawful.</p>
        <h2 className="text-lg font-semibold text-ink pt-4">Billing</h2>
        <p>Paid plans are billed monthly through Lemon Squeezy and can be cancelled at any time. The Free plan is free with no card required.</p>
        <h2 className="text-lg font-semibold text-ink pt-4">No guarantee</h2>
        <p>We work to keep checks and alerts reliable but provide the service &quot;as is&quot;, without any uptime guarantee. We are not liable for losses caused by missed or delayed alerts.</p>
        <h2 className="text-lg font-semibold text-ink pt-4">Changes</h2>
        <p>We may update these terms or the service. Continued use after changes means you accept them.</p>
      </div>
      <MarketingFooter />
    </div>
  );
}
