"use client";

import { useEffect, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { Activity, Plus, Trash2, Pause, Play, ExternalLink, BarChart2 } from "lucide-react";
import Link from "next/link";
import { Monitor } from "@/lib/supabase";
import { cn, formatResponseTime, getStatusBg, PLAN_LIMITS } from "@/lib/utils";
import AddMonitorModal from "@/components/AddMonitorModal";
import CreateStatusPageModal from "@/components/CreateStatusPageModal";

export default function DashboardPage() {
  const { user } = useUser();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [statusPages, setStatusPages] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [dbUser, setDbUser] = useState<{ plan: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showStatusPage, setShowStatusPage] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchMonitors() {
    const m = await fetch("/api/monitors").then((r) => r.json());
    setMonitors(Array.isArray(m) ? m : []);
  }

  async function deleteStatusPage(id: string) {
    await fetch(`/api/status-pages/${id}`, { method: "DELETE" });
    setStatusPages((prev) => prev.filter((p) => p.id !== id));
  }

  useEffect(() => {
    async function init() {
      await fetch("/api/user", { method: "POST" });
      const [uRes, mRes, spRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/monitors"),
        fetch("/api/status-pages"),
      ]);
      const u = await uRes.json();
      const m = await mRes.json();
      const sp = await spRes.json();
      setDbUser(u);
      setMonitors(Array.isArray(m) ? m : []);
      setStatusPages(Array.isArray(sp) ? sp : []);
      setLoading(false);
    }
    init();
    const interval = setInterval(fetchMonitors, 30000);
    return () => clearInterval(interval);
  }, []);

  async function deleteMonitor(id: string) {
    if (!confirm("Delete this monitor?")) return;
    await fetch(`/api/monitors/${id}`, { method: "DELETE" });
    setMonitors((prev) => prev.filter((m) => m.id !== id));
  }

  async function toggleMonitor(monitor: Monitor) {
    const res = await fetch(`/api/monitors/${monitor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !monitor.is_active }),
    });
    const updated = await res.json();
    setMonitors((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  const plan = (dbUser?.plan ?? "free") as keyof typeof PLAN_LIMITS;
  const limit = PLAN_LIMITS[plan]?.monitors ?? 3;
  const upCount = monitors.filter((m) => m.status === "up").length;
  const downCount = monitors.filter((m) => m.status === "down").length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Activity className="text-blue-500" size={20} />
          UptimeWatch
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 capitalize">{plan} plan</span>
          <UserButton />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Hello, {user?.firstName ?? "there"}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowStatusPage(true)}
              className="border border-gray-700 hover:border-gray-500 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium"
            >
              + Status Page
            </button>
            <button
              onClick={() => setShowAdd(true)}
              disabled={monitors.length >= limit}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                monitors.length >= limit
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              )}
            >
              <Plus size={16} />
              Add Monitor
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Total Monitors</div>
            <div className="text-3xl font-bold">{monitors.length}<span className="text-gray-500 text-lg">/{limit}</span></div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Operational</div>
            <div className="text-3xl font-bold text-green-400">{upCount}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Down</div>
            <div className="text-3xl font-bold text-red-400">{downCount}</div>
          </div>
        </div>

        {/* Plan limit warning */}
        {monitors.length >= limit && (
          <div className="bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
            <span className="text-yellow-300 text-sm">Monitor limit reached for {plan} plan.</span>
            <Link href="/dashboard?upgrade=true" className="text-yellow-400 hover:text-yellow-300 text-sm font-medium underline">
              Upgrade
            </Link>
          </div>
        )}

        {/* Monitors list */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading...</div>
        ) : monitors.length === 0 ? (
          <div className="text-center py-20">
            <Activity size={40} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-400 mb-4">No monitors yet. Add your first URL to start monitoring.</p>
            <button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium">
              Add your first monitor
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {monitors.map((m) => (
              <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                {/* Status dot */}
                <div className={cn("w-3 h-3 rounded-full shrink-0", getStatusBg(m.status))} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.name}</div>
                  <div className="text-gray-400 text-sm truncate">{m.url}</div>
                </div>

                {/* Status badge */}
                <div className={cn("text-xs font-semibold px-2 py-1 rounded shrink-0",
                  m.status === "up" ? "bg-green-950 text-green-400" :
                  m.status === "down" ? "bg-red-950 text-red-400" :
                  "bg-gray-800 text-gray-400"
                )}>
                  {m.status.toUpperCase()}
                </div>

                {/* Last checked */}
                <div className="text-gray-500 text-xs w-24 text-right shrink-0">
                  {m.last_checked_at ? new Date(m.last_checked_at).toLocaleTimeString() : "Not checked"}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/dashboard/monitors/${m.id}`} className="p-2 hover:bg-gray-800 rounded-lg" title="View details">
                    <BarChart2 size={16} className="text-gray-400" />
                  </Link>
                  <button onClick={() => toggleMonitor(m)} className="p-2 hover:bg-gray-800 rounded-lg" title={m.is_active ? "Pause" : "Resume"}>
                    {m.is_active ? <Pause size={16} className="text-gray-400" /> : <Play size={16} className="text-green-400" />}
                  </button>
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-800 rounded-lg" title="Open URL">
                    <ExternalLink size={16} className="text-gray-400" />
                  </a>
                  <button onClick={() => deleteMonitor(m.id)} className="p-2 hover:bg-gray-800 rounded-lg" title="Delete">
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Status Pages */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Status Pages</h2>
            <button onClick={() => setShowStatusPage(true)} className="border border-gray-700 hover:border-gray-500 text-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium">
              + New
            </button>
          </div>
          {statusPages.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm border border-gray-800 rounded-xl">
              No status pages yet. Create one to share uptime with your users.
            </div>
          ) : (
            <div className="space-y-2">
              {statusPages.map((sp) => (
                <div key={sp.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{sp.title}</div>
                    <div className="text-gray-500 text-sm">/status/{sp.slug}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`/status/${sp.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 px-3 py-1.5 border border-gray-700 rounded-lg">
                      View
                    </a>
                    <button onClick={() => deleteStatusPage(sp.id)} className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 border border-gray-800 rounded-lg">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upgrade section */}
        {plan === "free" && (
          <div className="mt-12 bg-blue-950/30 border border-blue-800 rounded-xl p-6 flex items-center justify-between">
            <div>
              <div className="font-semibold mb-1">Upgrade to Starter — $19/month</div>
              <div className="text-gray-400 text-sm">20 monitors, 1-minute checks, 3 status pages, 30-day history</div>
            </div>
            <UpgradeButton plan="starter" />
          </div>
        )}
      </main>

      {showAdd && (
        <AddMonitorModal
          onClose={() => setShowAdd(false)}
          onAdded={(m) => { setMonitors((prev) => [m, ...prev]); setShowAdd(false); }}
        />
      )}
      {showStatusPage && (
        <CreateStatusPageModal
          monitors={monitors}
          onClose={() => setShowStatusPage(false)}
          onCreated={(sp) => { setStatusPages((prev) => [sp, ...prev]); setShowStatusPage(false); }}
        />
      )}
    </div>
  );
}

function UpgradeButton({ plan }: { plan: string }) {
  async function handleUpgrade() {
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }
  return (
    <button onClick={handleUpgrade} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium text-sm shrink-0">
      Upgrade now
    </button>
  );
}
