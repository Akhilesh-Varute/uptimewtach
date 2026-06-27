"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Monitor, MonitorCheck } from "@/lib/supabase";
import { formatResponseTime, formatUptime, getStatusBg, cn } from "@/lib/utils";

type DetailData = {
  monitor: Monitor;
  checks: MonitorCheck[];
  incidents: { id: string; started_at: string; resolved_at: string | null; status: string }[];
};

export default function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailData | null>(null);

  useEffect(() => {
    fetch(`/api/monitors/${id}`).then((r) => r.json()).then(setData);
  }, [id]);

  if (!data) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  );

  const { monitor, checks, incidents } = data;

  const chartData = checks.map((c) => ({
    time: new Date(c.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    ms: c.response_time_ms ?? 0,
    status: c.status,
  }));

  const upCount = checks.filter((c) => c.status === "up").length;
  const uptime = checks.length > 0 ? (upCount / checks.length) * 100 : 100;
  const avgMs = checks.length > 0
    ? checks.reduce((s, c) => s + (c.response_time_ms ?? 0), 0) / checks.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex items-center gap-2 font-bold">
          <Activity className="text-blue-500" size={18} />
          UptimeWatch
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className={cn("w-4 h-4 rounded-full", getStatusBg(monitor.status))} />
          <div>
            <h1 className="text-2xl font-bold">{monitor.name}</h1>
            <a href={monitor.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">{monitor.url}</a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Uptime (24h)</div>
            <div className="text-3xl font-bold text-green-400">{formatUptime(uptime)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Avg Response</div>
            <div className="text-3xl font-bold">{formatResponseTime(Math.round(avgMs))}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Check Interval</div>
            <div className="text-3xl font-bold">{monitor.interval_seconds}s</div>
          </div>
        </div>

        {/* Response time chart */}
        {chartData.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="font-semibold mb-4">Response Time (last 24h)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} unit="ms" width={55} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#9ca3af" }}
                  formatter={(val) => [`${val}ms`, "Response"]}
                />
                <Line type="monotone" dataKey="ms" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Incidents */}
        {incidents.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold mb-4">Recent Incidents</h2>
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className={cn("font-medium", inc.status === "ongoing" ? "text-red-400" : "text-green-400")}>
                      {inc.status === "ongoing" ? "Ongoing" : "Resolved"}
                    </span>
                    <span className="text-gray-400 ml-3">Started: {new Date(inc.started_at).toLocaleString()}</span>
                  </div>
                  {inc.resolved_at && (
                    <span className="text-gray-500">Resolved: {new Date(inc.resolved_at).toLocaleString()}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
