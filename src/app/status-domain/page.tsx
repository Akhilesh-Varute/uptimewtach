import { Activity, CheckCircle, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";

type DayBar = { date: string; uptime: number };

type MonitorRow = {
  id: string;
  name: string;
  display_name: string;
  status: "up" | "down" | "pending";
  uptime: number;
  last_checked_at: string | null;
  avg_response_ms: number | null;
  days: DayBar[];
};

async function getStatusPageByDomain(domain: string) {
  const { data: page, error } = await getSupabaseAdmin()
    .from("status_pages")
    .select("*, status_page_monitors(sort_order, display_name, monitors(id, name, status, url, last_checked_at))")
    .eq("custom_domain", domain)
    .single();

  if (error || !page) return null;

  const monitorRows = ((page.status_page_monitors ?? []) as Array<{
    sort_order: number;
    display_name: string | null;
    monitors: { id: string; name: string; status: string; last_checked_at: string | null };
  }>).sort((a, b) => a.sort_order - b.sort_order);

  const monitors = await Promise.all(
    monitorRows.map(async (row) => {
      const monitor = row.monitors;
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const { data: checks } = await getSupabaseAdmin()
        .from("monitor_checks")
        .select("status, response_time_ms, checked_at")
        .eq("monitor_id", monitor.id)
        .gte("checked_at", since)
        .order("checked_at", { ascending: true });

      const total = checks?.length ?? 0;
      const up = checks?.filter((c: { status: string }) => c.status === "up").length ?? 0;
      const uptime = total > 0 ? (up / total) * 100 : 100;

      const responseTimes = checks
        ?.map((c: { response_time_ms: number | null }) => c.response_time_ms)
        .filter((t): t is number => t !== null) ?? [];
      const avg_response_ms =
        responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : null;

      const dayMap: Record<string, { up: number; total: number }> = {};
      for (let i = 89; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dayMap[d.toISOString().slice(0, 10)] = { up: 0, total: 0 };
      }
      for (const c of checks ?? []) {
        const day = (c as { checked_at: string }).checked_at.slice(0, 10);
        if (dayMap[day]) {
          dayMap[day].total++;
          if ((c as { status: string }).status === "up") dayMap[day].up++;
        }
      }
      const days: DayBar[] = Object.entries(dayMap).map(([date, { up, total }]) => ({
        date,
        uptime: total > 0 ? (up / total) * 100 : 100,
      }));

      return { ...monitor, display_name: row.display_name ?? monitor.name, uptime, avg_response_ms, days };
    })
  );

  return { page, monitors };
}

function UptimeBar({ days }: { days: DayBar[] }) {
  return (
    <div className="flex gap-0.5 mt-3">
      {days.map((d, i) => (
        <div
          key={i}
          title={`${d.date}: ${d.uptime.toFixed(1)}%`}
          className={`h-6 flex-1 rounded-sm ${d.uptime === 100 ? "bg-green-500" : d.uptime >= 50 ? "bg-yellow-500" : "bg-red-500"} opacity-80 hover:opacity-100`}
        />
      ))}
    </div>
  );
}

function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default async function StatusDomainPage({
  searchParams,
}: {
  searchParams: Promise<{ host?: string }>;
}) {
  const { host } = await searchParams;
  if (!host) notFound();

  // Strip port if present (e.g. "status.example.com:443" → "status.example.com")
  const domain = host.split(":")[0];
  const data = await getStatusPageByDomain(domain);
  if (!data) notFound();

  const { page, monitors } = data as {
    page: { title: string; description: string };
    monitors: MonitorRow[];
  };
  const allUp = monitors.every((m) => m.status !== "down");

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-4">
            <Activity size={14} />
            Powered by UptimeWatch
          </div>
          <h1 className="text-3xl font-bold mb-2">{page.title}</h1>
          {page.description && <p className="text-gray-400">{page.description}</p>}
        </div>

        <div
          className={`rounded-xl p-4 mb-8 flex items-center gap-3 ${
            allUp ? "bg-green-950 border border-green-800" : "bg-red-950 border border-red-800"
          }`}
        >
          {allUp ? (
            <>
              <CheckCircle className="text-green-400" size={20} />
              <span className="font-semibold text-green-300">All systems operational</span>
            </>
          ) : (
            <>
              <XCircle className="text-red-400" size={20} />
              <span className="font-semibold text-red-300">
                Some systems are experiencing issues
              </span>
            </>
          )}
        </div>

        <div className="space-y-3">
          {monitors.map((m) => (
            <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      m.status === "up"
                        ? "bg-green-400"
                        : m.status === "down"
                        ? "bg-red-400"
                        : "bg-gray-400"
                    }`}
                  />
                  <span className="font-medium">{m.display_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  {m.avg_response_ms !== null && (
                    <span className="text-gray-500 text-xs">{m.avg_response_ms}ms</span>
                  )}
                  <span className="text-gray-400 text-sm">{m.uptime.toFixed(2)}%</span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${
                      m.status === "up"
                        ? "bg-green-950 text-green-400"
                        : m.status === "down"
                        ? "bg-red-950 text-red-400"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {m.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <UptimeBar days={m.days} />
              <div className="flex justify-between mt-1.5 text-gray-600 text-xs">
                <span>90 days ago</span>
                <span>Checked {timeAgo(m.last_checked_at)}</span>
                <span>Today</span>
              </div>
            </div>
          ))}
        </div>

        {monitors.length === 0 && (
          <div className="text-center text-gray-500 py-12">No monitors on this status page yet.</div>
        )}

        <p className="text-center text-gray-600 text-xs mt-12">
          Last updated: {new Date().toUTCString()}
        </p>
      </div>
    </div>
  );
}
