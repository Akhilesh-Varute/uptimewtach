/** The UptimeWatch mark: a pulse line on a graphite tile. Matches app/icon.svg and uses theme tokens. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" style={{ fill: "var(--color-paper-3)" }} />
      <polyline
        points="3,16 8,16 11,9 14,23 17,13 20,19 23,16 29,16"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ stroke: "var(--color-accent)" }}
      />
    </svg>
  );
}
