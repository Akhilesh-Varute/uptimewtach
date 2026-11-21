// Asks regional probes (see probe/server.mjs) whether they can reach a target the primary check
// thinks is down. Configure with PROBE_URLS (comma-separated base URLs) and PROBE_SECRET.
// With no probes configured, the primary verdict stands (old behaviour).

export type Target = { kind: "http"; url: string; keyword?: string | null } | { kind: "tcp"; host: string; port: number };
type ProbeResult = { region: string; status: "up" | "down"; error?: string | null };

const probeUrls = () => (process.env.PROBE_URLS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

async function ask(base: string, target: Target): Promise<ProbeResult | null> {
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/probe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-probe-secret": process.env.PROBE_SECRET ?? "" },
      body: JSON.stringify(target),
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok ? ((await res.json()) as ProbeResult) : null;
  } catch {
    return null; // an unreachable probe is "no vote", never "down"
  }
}

/**
 * The primary region already saw the target as down. Returns whether the outage is confirmed by a
 * majority (primary counts as one "down" vote) plus a human-readable summary for the alert.
 */
export async function confirmWithRegions(target: Target): Promise<{ confirmed: boolean; summary: string | null }> {
  const urls = probeUrls();
  if (!urls.length) return { confirmed: true, summary: null };

  const votes = (await Promise.all(urls.map((u) => ask(u, target)))).filter((v): v is ProbeResult => v !== null);
  if (!votes.length) return { confirmed: true, summary: null }; // probes unavailable: fall back to the primary verdict

  const down = 1 + votes.filter((v) => v.status === "down").length;
  const total = 1 + votes.length;
  const upRegions = votes.filter((v) => v.status === "up").map((v) => v.region);
  return {
    confirmed: down * 2 > total, // strict majority; a tie means another region reached it
    summary: upRegions.length
      ? `Down from ${down} of ${total} regions; reachable from ${upRegions.join(", ")}.`
      : `Confirmed down from all ${total} regions.`,
  };
}
