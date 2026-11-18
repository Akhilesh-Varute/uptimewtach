import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { fontClass } from "./marketing-fonts";
import { MarketingNav, MarketingFooter } from "./marketing-chrome";
import PlanButton from "@/components/PlanButton";
import { plans } from "./marketing-data";

// Sample rows mirror the /status/demo page; downtime days are fixed so the picture is stable.
const sample = [
  { name: "Website", ms: "142 ms", pct: "99.98%", up: true, down: [41] },
  { name: "API", ms: "89 ms", pct: "99.91%", up: true, down: [17, 52] },
  { name: "Dashboard", ms: "", pct: "97.30%", up: false, down: [8, 23, 24, 44, 59] },
  { name: "CDN", ms: "23 ms", pct: "100.00%", up: true, down: [] as number[] },
];

export default async function HomePage() {
  const { userId } = await auth();
  return (
    <div className={`hm ${fontClass}`}>
      <MarketingNav signedIn={!!userId} />

      <main>
        <section className="hero">
          <h1>Know it&rsquo;s down before your users do.</h1>
          <p className="lead">Uptime monitoring and public status pages for developers and small teams.</p>
          <div className="hero__actions">
            <Link href="/sign-up" className="btn btn--primary">Start free: 10 monitors</Link>
            <Link href="/status/demo" className="btn">See demo status page</Link>
          </div>
          <p className="hero__note muted">Freshping shut down? We have you covered.</p>
        </section>

        <section className="sec--tight" aria-label="Sample status page">
          <div className="container">
            <div className="panel">
              <div className="panel__head">
                <h2>Sample status page</h2>
                <span className="chip chip--cool">Sample data</span>
              </div>
              <p className="panel__banner">Some systems are experiencing issues</p>
              {sample.map((m) => (
                <div className="mon" key={m.name}>
                  <span className="mon__name">{m.name}</span>
                  <div className="mon__bars" aria-hidden="true">
                    {Array.from({ length: 60 }, (_, i) => (
                      <i key={i} className={m.down.includes(i) ? "dn" : undefined} />
                    ))}
                  </div>
                  <span className="num mon__ms">{m.ms}</span>
                  <span className="num">{m.pct}</span>
                  <span className={`mon__state mon__state--${m.up ? "up" : "down"}`}>{m.up ? "Up" : "Down"}</span>
                </div>
              ))}
              <div className="panel__foot">
                <small>Sample data from the demo status page.</small>
                <Link href="/status/demo" className="link"><small>Open the demo</small></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="sec" aria-labelledby="features">
          <div className="container">
            <div className="sec__head">
              <h2 id="features">What it watches</h2>
            </div>
            <div className="seams bento">
              <article className="tile tile--lead s6">
                <h3>HTTP &amp; TCP Monitoring</h3>
                <div>
                  <div className="reading">
                    <div><b>1 min</b><small>Paid plans</small></div>
                    <div><b>5 min</b><small>Free plan</small></div>
                  </div>
                  <p style={{ marginTop: "var(--space-lg)" }}>Check URLs and ports every 1-5 minutes, depending on your plan.</p>
                </div>
              </article>
              <article className="tile s3">
                <h3>Heartbeat Monitors</h3>
                <p>Your cron job pings us; we alert you if it stops.</p>
              </article>
              <article className="tile s3">
                <h3>SSL Expiry Alerts</h3>
                <p>Get warned before a certificate expires, not after.</p>
              </article>
              <article className="tile s3">
                <h3>Down &amp; Recovery Alerts</h3>
                <p>Email when a monitor goes down and when it recovers. Webhooks on Pro and above.</p>
              </article>
              <article className="tile s3">
                <h3>Public Status Pages</h3>
                <p>Share live status with customers. Custom domains on Pro and above.</p>
              </article>
              <article className="tile s6">
                <h3>Uptime History</h3>
                <div>
                  <div className="chips">
                    <span className="chip">7 days</span>
                    <span className="chip">30 days</span>
                    <span className="chip">90 days</span>
                    <span className="chip chip--cool">1 year</span>
                  </div>
                  <p style={{ marginTop: "var(--space-lg)" }}>Response-time graphs and uptime percentage, 7 days to 1 year by plan.</p>
                </div>
              </article>
              <article className="tile s6">
                <h3>API Access</h3>
                <p>Manage monitors programmatically on Starter and above.</p>
              </article>
              <article className="tile s6">
                <h3>Uptime Badge</h3>
                <div>
                  <div className="badge-slot">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/api/badge/262f94fd-c6ae-4ca9-9616-ee7e24971230" alt="UptimeWatch uptime badge for this project" />
                  </div>
                  <p style={{ marginTop: "var(--space-lg)" }}>Embed a live uptime badge in your README or site.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="sec" id="pricing" aria-labelledby="pricing-head">
          <div className="container">
            <div className="sec__head">
              <h2 id="pricing-head">Simple pricing</h2>
              <p className="lead">Start free. Upgrade when you need more.</p>
            </div>
            <div className="seams plans">
              {plans.map((p) => (
                <article className="plan" key={p.name}>
                  <div>
                    <h3>{p.name}</h3>
                    <small>{p.desc}</small>
                  </div>
                  <p className="plan__price">{p.price}<small>/mo</small></p>
                  <ul>
                    <li>{p.monitors}</li>
                    <li>{p.checks}</li>
                    <li>{p.pages}</li>
                    <li>{p.alerts}</li>
                    <li>{p.history}</li>
                    {p.api && <li>API access</li>}
                    {p.domains && <li>Custom domains</li>}
                  </ul>
                  <PlanButton name={p.name} cta={p.cta} href={p.href} signedIn={!!userId} className={p.name === "Free" ? "btn btn--primary" : "btn"} />
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
