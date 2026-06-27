import { Activity, CheckCircle, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";

type MonitorRow = {
  id: string;
  name: string;
  display_name: string;
  status: "up" | "down" | "pending";
  uptime: number;
  last_checked_at: string | null;
};

const DEMO_DATA = {
  page: { title: "Acme Corp Status", description: "Real-time status for all Acme services." },
  monitors: [
    { id: "1", name: "Website", display_name: "Website", status: "up" as const, uptime: 99.98, last_checked_at: new Date().toISOString() },
    { id: "2", name: "API", display_name: "API", status: "up" as const, uptime: 99.91, last_checked_at: new Date().toISOString() },
    { id: "3", name: "Dashboard", display_name: "Dashboard", status: "down" as const, uptime: 97.30, last_checked_at: new Date().toISOString() },
    { id: "4", name: "CDN", display_name: "CDN", status: "up" as const, uptime: 100.00, last_checked_at: new Date().toISOString() },
  ],
};

async function getStatusPage(slug: string) {
  if (slug === "demo") return DEMO_DATA;

  const { data: page, error } = await getSupabaseAdmin()
    .from("status_pages")
    .select("*, status_page_monitors(sort_order, display_name, monitors(id, name, status, url, last_checked_at))")
    .eq("slug", slug)
    .single();

  if (error || !page) return null;

  const monitorRows = ((page.status_page_monitors ?? []) as Array<{ sort_order: number; display_name: string | null; monitors: { id: string; name: string; status: string } }>)
    .sort((a, b) => a.sort_order - b.sort_order);

  const monitors = await Promise.all(
    monitorRows.map(async (row) => {
      const monitor = row.monitors;
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data: checks } = await getSupabaseAdmin()
        .from("monitor_checks")
        .select("status")
        .eq("monitor_id", monitor.id)
        .gte("checked_at", since);
      const total = checks?.length ?? 0;
      const up = checks?.filter((c: { status: string }) => c.status === "up").length ?? 0;
      return { ...monitor, display_name: row.display_name ?? monitor.name, uptime: total > 0 ? (up / total) * 100 : 100 };
    })
  );

  return { page, monitors };
}

export default async function StatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getStatusPage(slug);
  if (!data) notFound();

  const { page, monitors } = data as { page: { title: string; description: string }; monitors: MonitorRow[] };
  const allUp = monitors.every((m) => m.status !== "down");

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-4">
            <Activity size={14} />
            Powered by UptimeWatch
          </div>
          <h1 className="text-3xl font-bold mb-2">{page.title}</h1>
          {page.description && <p className="text-gray-400">{page.description}</p>}
        </div>

        {/* Overall status banner */}
        <div className={`rounded-xl p-4 mb-8 flex items-center gap-3 ${allUp ? "bg-green-950 border border-green-800" : "bg-red-950 border border-red-800"}`}>
          {allUp
            ? <><CheckCircle className="text-green-400" size={20} /><span className="font-semibold text-green-300">All systems operational</span></>
            : <><XCircle className="text-red-400" size={20} /><span className="font-semibold text-red-300">Some systems are experiencing issues</span></>
          }
        </div>

        {/* Monitors */}
        <div className="space-y-3">
          {monitors.map((m) => (
            <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${m.status === "up" ? "bg-green-400" : m.status === "down" ? "bg-red-400" : "bg-gray-400"}`} />
                <span className="font-medium">{m.display_name}</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-gray-400 text-sm">{m.uptime.toFixed(2)}% uptime</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${m.status === "up" ? "bg-green-950 text-green-400" : m.status === "down" ? "bg-red-950 text-red-400" : "bg-gray-800 text-gray-400"}`}>
                  {m.status.toUpperCase()}
                </span>
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
