// Usage: node --env-file=.env.local scripts/user-report.mjs [months=3]
// For production profiles, run with the live key: CLERK_SECRET_KEY=sk_live_... node --env-file=.env.local scripts/user-report.mjs
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";

const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const months = Number(process.argv[2] ?? 3);
const sinceDate = new Date(); sinceDate.setMonth(sinceDate.getMonth() - months);
const since = sinceDate.toISOString();
const day = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const csv = (rows) => rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

async function all(table, select, filter = "", order = "created_at.asc") {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${U}/rest/v1/${table}?select=${select}${filter}&order=${order}`, { headers: { apikey: K, Authorization: `Bearer ${K}`, Range: `${from}-${from + 999}` } });
    const rows = await r.json();
    if (!Array.isArray(rows)) throw new Error(`${table}: ${JSON.stringify(rows)}`);
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

const users = await all("users", "id,clerk_id,email,plan,created_at");
const monitors = await all("monitors", "id,user_id,is_active,created_at");
const pages = await all("status_pages", "user_id,created_at");
const keys = await all("api_keys", "user_id,created_at,last_used_at");
const incidents = await all("incidents", "monitor_id,started_at", `&started_at=gte.${since}`, "started_at.asc");
const checks = await all("monitor_checks", "monitor_id,status,checked_at", `&checked_at=gte.${since}`, "checked_at.asc");

// Clerk profiles (only users that exist in the instance the key belongs to)
const clerk = new Map();
const cr = await fetch("https://api.clerk.com/v1/users?limit=500", { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } });
const cd = await cr.json();
if (Array.isArray(cd)) cd.forEach((c) => clerk.set(c.id, c));
// Optional: profiles exported from another Clerk instance (e.g. production) as reports/clerk-users.json, matched by Clerk id
if (existsSync("reports/clerk-users.json")) JSON.parse(readFileSync("reports/clerk-users.json", "utf8")).forEach((c) => clerk.set(c.id, c));

const owner = new Map(monitors.map((m) => [m.id, m.user_id]));
const label = new Map();
const daily = new Map(); // `${date}|${user}` -> counters
const bump = (date, uid, field, n = 1) => {
  const key = `${date}|${uid}`;
  const row = daily.get(key) ?? { monitors_created: 0, checks: 0, failed_checks: 0, incidents: 0, status_pages_created: 0 };
  row[field] += n; daily.set(key, row);
};
const inWindow = (iso) => iso >= since;
monitors.filter((m) => inWindow(m.created_at)).forEach((m) => bump(day(m.created_at), m.user_id, "monitors_created"));
pages.filter((p) => inWindow(p.created_at)).forEach((p) => bump(day(p.created_at), p.user_id, "status_pages_created"));
incidents.forEach((i) => owner.get(i.monitor_id) && bump(day(i.started_at), owner.get(i.monitor_id), "incidents"));
checks.forEach((c) => {
  const uid = owner.get(c.monitor_id); if (!uid) return;
  bump(day(c.checked_at), uid, "checks");
  if (c.status !== "up") bump(day(c.checked_at), uid, "failed_checks");
});

const rows1 = [["username", "name", "email", "plan", "signed_up", "last_sign_in", "monitors_now", "active_monitors", "status_pages", "api_keys", "checks_in_period", "incidents_in_period", "clerk_profile"]];
for (const u of users) {
  const c = clerk.get(u.clerk_id);
  const name = c ? [c.first_name, c.last_name].filter(Boolean).join(" ") : "";
  const uname = c?.username || (c ? "" : "") || u.email.split("@")[0];
  label.set(u.id, uname);
  const mine = monitors.filter((m) => m.user_id === u.id);
  const sum = (f) => [...daily].filter(([k]) => k.endsWith("|" + u.id)).reduce((a, [, v]) => a + v[f], 0);
  rows1.push([uname, name, u.email, u.plan, day(u.created_at), c?.last_sign_in_at ? day(new Date(c.last_sign_in_at).toISOString()) : "", mine.length, mine.filter((m) => m.is_active === true).length,
    pages.filter((p) => p.user_id === u.id).length, keys.filter((k) => k.user_id === u.id).length, sum("checks"), sum("incidents"), c ? "found" : "not in this Clerk instance"]);
}

const rows2 = [["date", "username", "plan", "monitors_created", "checks", "failed_checks", "incidents_started", "status_pages_created"]];
const plan = new Map(users.map((u) => [u.id, u.plan]));
[...daily].sort(([a], [b]) => (a < b ? -1 : 1)).forEach(([k, v]) => {
  const [date, uid] = k.split("|");
  rows2.push([date, label.get(uid) ?? uid, plan.get(uid), v.monitors_created, v.checks, v.failed_checks, v.incidents, v.status_pages_created]);
});

mkdirSync("reports", { recursive: true });
writeFileSync("reports/users-summary.csv", csv(rows1));
writeFileSync("reports/daily-activity.csv", csv(rows2));
console.log(`window since ${day(since)} | users ${users.length} | clerk profiles found ${rows1.slice(1).filter((r) => r[12] === "found").length} | checks ${checks.length} | daily rows ${rows2.length - 1}`);
