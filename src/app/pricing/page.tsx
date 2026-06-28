import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Activity, CheckCircle } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    desc: "Perfect to get started",
    features: [
      "10 monitors",
      "5-minute checks",
      "1 status page",
      "Email alerts",
      "7-day history",
    ],
    cta: "Start free",
    href: "/sign-up",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$19",
    period: "/mo",
    desc: "For indie developers",
    features: [
      "20 monitors",
      "1-minute checks",
      "3 status pages",
      "Email alerts",
      "30-day history",
    ],
    cta: "Get started",
    href: "/sign-up",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    desc: "For growing teams",
    features: [
      "100 monitors",
      "1-minute checks",
      "Unlimited status pages",
      "Email & webhook alerts",
      "90-day history",
    ],
    cta: "Get started",
    href: "/sign-up",
    highlight: false,
  },
  {
    name: "Business",
    price: "$99",
    period: "/mo",
    desc: "For large teams",
    features: [
      "500 monitors",
      "1-minute checks",
      "Unlimited status pages",
      "Email & webhook alerts",
      "1-year history",
    ],
    cta: "Get started",
    href: "/sign-up",
    highlight: false,
  },
];

const faqs = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel anytime from your account — no questions asked, no lock-in.",
  },
  {
    q: "What happens when I hit my monitor limit?",
    a: "You'll see a warning and won't be able to add more monitors until you upgrade or delete existing ones.",
  },
  {
    q: "How do email alerts work?",
    a: "When a monitor goes down we send you an email instantly. When it recovers, you get another email.",
  },
  {
    q: "Is there a free trial?",
    a: "The Free plan is free forever — no credit card required. Upgrade only when you need more.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Credit/debit cards and PayPal via Lemon Squeezy. Secure checkout, no card details stored by us.",
  },
];

export default async function PricingPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Activity className="text-blue-500" size={22} />
          UptimeWatch
        </Link>
        <div className="flex items-center gap-4">
          {userId ? (
            <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-gray-400 hover:text-white text-sm">Sign in</Link>
              <Link href="/sign-up" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Start free
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-gray-400 text-lg">Start free. Upgrade when you need more.</p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {plans.map((p) => (
            <div key={p.name} className={`rounded-xl p-6 border flex flex-col ${p.highlight ? "border-blue-500 bg-blue-950/20" : "border-gray-800 bg-gray-900"}`}>
              {p.highlight && (
                <div className="text-blue-400 text-xs font-semibold mb-3 uppercase tracking-widest">Most popular</div>
              )}
              <div className="text-xl font-bold mb-1">{p.name}</div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold">{p.price}</span>
                <span className="text-gray-400 text-sm mb-1">{p.period}</span>
              </div>
              <div className="text-gray-500 text-sm mb-6">{p.desc}</div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle size={14} className="text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className={`block text-center py-2.5 rounded-lg font-medium text-sm ${p.highlight ? "bg-blue-600 hover:bg-blue-500 text-white" : "border border-gray-700 hover:border-gray-500 text-gray-300"}`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-6">
            {faqs.map((f) => (
              <div key={f.q} className="border-b border-gray-800 pb-6">
                <div className="font-semibold mb-2">{f.q}</div>
                <div className="text-gray-400 text-sm">{f.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-20">
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-400 mb-8">Join developers and teams who trust UptimeWatch to monitor their sites.</p>
          <Link href="/sign-up" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold text-lg">
            Start free — no credit card required
          </Link>
        </div>
      </div>
    </div>
  );
}
