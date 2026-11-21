# Regional probes

Before UptimeWatch raises a new outage, it asks these probes (in other regions) whether they can
reach the target. It alerts only if a majority of regions (the main app counts as one) see it down.
Without probes, alerts work exactly as before.

## Deploy on Fly.io (about $2/month per region)

Fly sends each request to the nearest machine, so each region gets its own small app.
Run this once per region (here Frankfurt, US East and Singapore), from this folder:

```bash
SECRET=$(openssl rand -hex 24)   # use the same secret for every region
for r in fra iad sin; do
  fly apps create uptimewatch-probe-$r
  fly secrets set PROBE_SECRET=$SECRET -a uptimewatch-probe-$r
  fly deploy -a uptimewatch-probe-$r --primary-region $r
done
```

Each machine reports its region automatically (`FLY_REGION`).

## Connect to UptimeWatch

Set these in Vercel (and `.env.local` for local testing), then redeploy:

- `PROBE_URLS`: comma-separated probe URLs, e.g. `https://uptimewatch-probe-fra.fly.dev,https://uptimewatch-probe-iad.fly.dev`
- `PROBE_SECRET`: the same secret as on the probes

Check a probe: `curl https://<probe>.fly.dev/health`
