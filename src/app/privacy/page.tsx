import Link from "next/link";

export const metadata = { title: "Privacy Policy — UptimeWatch" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-4 text-sm leading-relaxed">
        <Link href="/" className="text-blue-400 hover:text-blue-300">← UptimeWatch</Link>
        <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        <p>Last updated: November 2026</p>
        <h2 className="text-lg font-semibold text-white pt-4">What we collect</h2>
        <p>Your email address and account details (via our sign-in provider, Clerk), the URLs, hosts and settings of the monitors you create, and the check results we record for them (status, response time, SSL expiry).</p>
        <h2 className="text-lg font-semibold text-white pt-4">How we use it</h2>
        <p>To run your monitors, send alerts and webhooks you configure, and display your status pages. We do not sell your data.</p>
        <h2 className="text-lg font-semibold text-white pt-4">Third parties</h2>
        <p>We use Clerk (authentication), Supabase (database), Resend (email delivery), Lemon Squeezy (payments) and Vercel (hosting). Payment details are handled by Lemon Squeezy; we do not store card numbers.</p>
        <h2 className="text-lg font-semibold text-white pt-4">Retention and deletion</h2>
        <p>Check history is kept for the period of your plan. You can delete monitors at any time; to delete your account and data, contact us.</p>
        <h2 className="text-lg font-semibold text-white pt-4">Contact</h2>
        <p>Questions? Email us at the support address shown on our sign-in emails.</p>
      </div>
    </div>
  );
}
