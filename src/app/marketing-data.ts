export const plans = [
  {
    name: "Free", price: "$0", desc: "Perfect to start", cta: "Start free", href: "/sign-up",
    monitors: "10 monitors", checks: "5-minute checks", pages: "1 status page", alerts: "Email alerts",
    history: "7-day history", api: false, domains: false,
  },
  {
    name: "Starter", price: "$19", desc: "For indie developers", cta: "Get started", href: "/sign-up",
    monitors: "20 monitors", checks: "1-minute checks", pages: "3 status pages", alerts: "Email alerts",
    history: "30-day history", api: true, domains: false,
  },
  {
    name: "Pro", price: "$49", desc: "For growing teams", cta: "Get started", href: "/sign-up",
    monitors: "100 monitors", checks: "1-minute checks", pages: "Unlimited status pages", alerts: "Email & webhook alerts",
    history: "90-day history", api: true, domains: true,
  },
  {
    name: "Business", price: "$99", desc: "For large teams", cta: "Get started", href: "/sign-up",
    monitors: "500 monitors", checks: "1-minute checks", pages: "Unlimited status pages", alerts: "Email & webhook alerts",
    history: "1-year history", api: true, domains: true,
  },
];

export const faqs = [
  { q: "Can I cancel anytime?", a: "Yes. Cancel anytime from your account, no questions asked, no lock-in." },
  { q: "What happens when I hit my monitor limit?", a: "You'll see a warning and won't be able to add more monitors until you upgrade or delete existing ones." },
  { q: "How do email alerts work?", a: "When a monitor goes down we send you an email instantly. When it recovers, you get another email." },
  { q: "Is there a free trial?", a: "The Free plan is free forever, no credit card required. Upgrade only when you need more." },
  { q: "What payment methods do you accept?", a: "Major credit/debit cards and other local payment methods, processed securely by Dodo Payments. We never store card details." },
];
