import Link from "next/link";

export function MarketingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="nav">
      <div className="nav__bar">
        <Link href="/" className="nav__brand">UptimeWatch</Link>
        <nav className="nav__links" aria-label="Main">
          <Link href="/pricing">Pricing</Link>
          {signedIn ? (
            <Link href="/dashboard" className="btn btn--primary">Dashboard</Link>
          ) : (
            <>
              <Link href="/sign-in">Sign in</Link>
              <Link href="/sign-up" className="btn btn--primary">Start free</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="foot">
      <div className="container">
        <p className="foot__mark">UptimeWatch</p>
        <nav className="foot__links" aria-label="Footer">
          <Link href="/pricing">Pricing</Link>
          <Link href="/freshping-alternative">Freshping Alternative</Link>
          <Link href="/uptimerobot-alternative">UptimeRobot Alternative</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
