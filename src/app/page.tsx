import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Activity, Bell, Globe, BarChart2, CheckCircle } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Activity className="text-blue-500" size={22} />
          UptimeWatch
        </div>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-gray-400 hover:text-white text-sm">Pricing</Link>
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

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-950 text-blue-300 text-sm px-3 py-1 rounded-full mb-6">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Freshping shut down? We have you covered.
        </div>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Know when your site goes down.
          <br />
          <span className="text-blue-400">Before your users do.</span>
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Simple uptime monitoring and public status pages for developers and small teams.
          Get email alerts in seconds. No complex setup.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/sign-up" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold text-lg">
            Start free — 3 monitors
          </Link>
          <Link href="/status/demo" className="border border-gray-700 hover:border-gray-500 text-gray-300 px-8 py-3 rounded-lg font-semibold text-lg">
            See demo status page
          </Link>
        </div>
        <p className="text-gray-500 text-sm mt-4">No credit card required</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: <Globe size={20} />, title: "HTTP Monitoring", desc: "Checks your URL every 1-5 minutes from multiple regions." },
          { icon: <Bell size={20} />, title: "Instant Alerts", desc: "Email alert the moment your site goes down or comes back." },
          { icon: <BarChart2 size={20} />, title: "Status Pages", desc: "Public status pages you can share with your customers." },
          { icon: <CheckCircle size={20} />, title: "Uptime Reports", desc: "24h response time graphs and uptime percentage history." },
        ].map((f) => (
          <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-blue-400 mb-3">{f.icon}</div>
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 pb-24" id="pricing">
        <h2 className="text-3xl font-bold text-center mb-12">Simple pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: "Free",
              price: "$0",
              desc: "Perfect to start",
              features: ["3 monitors", "5-minute checks", "1 status page", "Email alerts"],
              cta: "Start free",
              href: "/sign-up",
              highlight: false,
            },
            {
              name: "Starter",
              price: "$19",
              desc: "For small teams",
              features: ["20 monitors", "1-minute checks", "3 status pages", "Email alerts", "30-day history"],
              cta: "Get started",
              href: "/sign-up",
              highlight: true,
            },
            {
              name: "Pro",
              price: "$49",
              desc: "For growing teams",
              features: ["100 monitors", "30-second checks", "Unlimited status pages", "Email + SMS alerts", "90-day history"],
              cta: "Get started",
              href: "/sign-up",
              highlight: false,
            },
          ].map((p) => (
            <div key={p.name} className={`rounded-xl p-6 border ${p.highlight ? "border-blue-500 bg-blue-950/30" : "border-gray-800 bg-gray-900"}`}>
              {p.highlight && <div className="text-blue-400 text-xs font-semibold mb-2 uppercase tracking-wide">Most popular</div>}
              <div className="text-2xl font-bold mb-1">{p.name}</div>
              <div className="text-4xl font-bold mb-1">{p.price}<span className="text-gray-400 text-lg font-normal">/mo</span></div>
              <div className="text-gray-400 text-sm mb-6">{p.desc}</div>
              <ul className="space-y-2 mb-8">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle size={14} className="text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={p.href} className={`block text-center py-2 rounded-lg font-medium text-sm ${p.highlight ? "bg-blue-600 hover:bg-blue-500 text-white" : "border border-gray-700 hover:border-gray-500 text-gray-300"}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 text-center text-gray-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-3 font-semibold text-gray-300">
          <Activity size={16} className="text-blue-500" />
          UptimeWatch
        </div>
        <div className="flex items-center justify-center gap-6">
          <Link href="/pricing" className="hover:text-gray-300">Pricing</Link>
          <Link href="/freshping-alternative" className="hover:text-gray-300">Freshping Alternative</Link>
          <Link href="/uptimerobot-alternative" className="hover:text-gray-300">UptimeRobot Alternative</Link>
        </div>
      </footer>
    </div>
  );
}
