import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { fontClass } from "../marketing-fonts";
import { MarketingNav, MarketingFooter } from "../marketing-chrome";
import { plans, faqs } from "../marketing-data";

const rows: { label: string; get: (p: (typeof plans)[number]) => string | boolean }[] = [
  { label: "Monitors", get: (p) => p.monitors },
  { label: "Check interval", get: (p) => p.checks },
  { label: "Status pages", get: (p) => p.pages },
  { label: "Alerts", get: (p) => p.alerts },
  { label: "History", get: (p) => p.history },
  { label: "API access", get: (p) => p.api },
  { label: "Custom domains", get: (p) => p.domains },
];

export default async function PricingPage() {
  const { userId } = await auth();

  return (
    <div className={`hm ${fontClass}`}>
      <MarketingNav signedIn={!!userId} />

      <main>
        <section className="banner">
          <div className="banner__in">
            <h1>Simple, transparent pricing</h1>
            <p className="lead">Start free. Upgrade when you need more.</p>
          </div>
        </section>

        <section className="sec--tight" aria-label="Compare plans">
          <div className="container">
            <div className="tablewrap" role="region" aria-label="Plan comparison, scrolls sideways on small screens" tabIndex={0}>
              <table className="cmp">
                <caption className="visually-hidden">Plans compared</caption>
                <thead>
                  <tr>
                    <th scope="col"><span className="visually-hidden">Feature</span></th>
                    {plans.map((p) => (
                      <th scope="col" key={p.name}>
                        <span className="name">{p.name}</span>
                        <span className="price num">{p.price}<small>/mo</small></span>
                        <small>{p.desc}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row">{r.label}</th>
                      {plans.map((p) => {
                        const v = r.get(p);
                        return (
                          <td key={p.name} className={v === false ? "no" : undefined}>
                            {v === true ? "Included" : v === false ? "Not included" : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td />
                    {plans.map((p) => (
                      <td key={p.name}>
                        <Link href={p.href} className={p.name === "Free" ? "btn btn--primary" : "btn"}>{p.cta}</Link>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>

        <section className="sec" aria-labelledby="faq">
          <div className="container rows">
            <h2 id="faq">Frequently asked questions</h2>
            <div className="rows__list">
              {faqs.map((f) => (
                <div key={f.q}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band">
          <div className="container band__in">
            <div>
              <h2>Ready to get started?</h2>
              <p className="lead" style={{ marginTop: "var(--space-md)" }}>Set up your first monitor in under two minutes.</p>
            </div>
            <Link href="/sign-up" className="btn btn--primary">Start free</Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
