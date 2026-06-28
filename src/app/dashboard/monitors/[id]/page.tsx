"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity, ShieldCheck, ShieldAlert, ShieldOff, Webhook, SearchCheck, Copy, Check, Heart } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const [copiedPing, setCopiedPing] = useState(false);

  useEffect(() => {
    fetch("/api/monitors/" + id).then((r) => r.json()).then(setData);
  }, [id]);

  function copyBadge() {
    const url = window.location.origin + "/api/badge/" + id;
    navigator.clipboard.writeText("![Uptime](" + url + ")");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyPingUrl() {
    if (!data?.monitor.heartbeat_token) return;
    const url = window.location.origin + "/api/heartbeat/" + data.monitor.heartbeat_token;
    navigator.clipboard.writeText(url);
    setCopiedPing(true);
    setTimeout(() => setCopiedPing(false), 2000);
  }

  if (!data) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  );

  const { monitor, checks, incidents } = data;
  const isTcp = monitor.monitor_type === "tcp";
  const isHeartbeat = monitor.monitor_type === "heartbeat";
  const isHttps = !isTcp && !isHeartbeat && monitor.url.startsWith("https://");
  const isHttp = !isTcp && !isHeartbeat && !monitor.url.startsWith("https://");
  const pingUrl = isHeartbeat && monitor.heartbeat_token
    ? (typeof window !== "undefined" ? window.location.origin : "") + "/api/heartbeat/" + monitor.heartbeat_token
    : null;

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
        <div className="flex items-center gap-3 mb-8">
          <div className={cn("w-4 h-4 rounded-full", getStatusBg(monitor.status))} />
          <div>
            <h1 className="text-2xl font-bold">{monitor.name}</h1>
            {isTcp ? (
              <span className="text-blue-400 text-sm">{monitor.host}:{monitor.port} (TCP)</span>
            ) : isHeartbeat ? (
              <span className="text-pink-400 text-sm">Heartbeat — every {Math.round((monitor.interval_seconds ?? 300) / 60)}m</span>
            ) : (
              <a href={monitor.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">{monitor.url}</a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Uptime (24h)</div>
            <div className="text-3xl font-bold text-green-400">{formatUptime(uptime)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">{isHeartbeat ? "Last ping" : "Avg Response"}</div>
            <div className="text-3xl font-bold">
              {isHeartbeat
                ? (monitor.heartbeat_last_pinged_at ? new Date(monitor.heartbeat_last_pinged_at).toLocaleTimeString() : "Never")
                : formatResponseTime(Math.round(avgMs))}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">{isHeartbeat ? "Grace period" : "Check Interval"}</div>
            <div className="text-3xl font-bold">
              {isHeartbeat ? (monitor.heartbeat_grace_seconds ?? 300) + "s" : monitor.interval_seconds + "s"}
            </div>
          </div>
        </div>

        {/* Heartbeat ping URL */}
        {isHeartbeat && pingUrl && (
          <div className="bg-pink-950/30 border border-pink-800/50 rounded-xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Heart size={16} className="text-pink-400" />
              <span className="font-medium text-sm">Ping URL</span>
              <span className="text-xs text-gray-500">Call this from your cron job or script (GET or POST)</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono text-pink-300 break-all">{pingUrl}</code>
              <button onClick={copyPingUrl} className="shrink-0 p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
                {copiedPing ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Example: <code className="text-gray-400">curl {pingUrl}</code>
            </p>
          </div>
        )}

        {/* Info strip */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8 flex flex-wrap items-center gap-6">
          {isTcp ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <div>
                <div className="text-xs text-gray-500">TCP / Port</div>
                <div className="text-sm font-medium text-blue-300">{monitor.host}:{monitor.port}</div>
              </div>
            </div>
          ) : !isHeartbeat && (
            <>
              {isHttp && (
                <div className="flex items-center gap-2">
                  <ShieldOff size={16} className="text-gray-500" />
                  <div>
                    <div className="text-xs text-gray-500">SSL certificate</div>
                    <div className="text-sm font-medium text-gray-500">Not monitored — URL is HTTP</div>
                  </div>
                </div>
              )}
              {isHttps && (
                <div className="flex items-center gap-2">
                  {monitor.ssl_days_remaining === null ? (
                    <ShieldOff size={16} className="text-gray-500" />
                  ) : monitor.ssl_days_remaining <= 7 ? (
                    <ShieldAlert size={16} className="text-red-400" />
                  ) : monitor.ssl_days_remaining <= 30 ? (
                    <ShieldAlert size={16} className="text-yellow-400" />
                  ) : (
                    <ShieldCheck size={16} className="text-green-400" />
                  )}
                  <div>
                    <div className="text-xs text-gray-500">SSL certificate</div>
                    <div className="text-sm font-medium">
                      {monitor.ssl_days_remaining === null ? (
                        <span className="text-gray-500">{monitor.last_checked_at ? "N/A" : "Checking…"}</span>
                      ) : monitor.ssl_days_remaining <= 0 ? (
                        <span className="text-red-400">Expired</span>
                      ) : monitor.ssl_days_remaining <= 7 ? (
                        <span className="text-red-400">{monitor.ssl_days_remaining}d left</span>
                      ) : monitor.ssl_days_remaining <= 30 ? (
                        <span className="text-yellow-400">{monitor.ssl_days_remaining}d left</span>
                      ) : (
                        <span className="text-green-400">{monitor.ssl_days_remaining}d left</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {monitor.webhook_url && (
                <div className="flex items-center gap-2">
                  <Webhook size={16} className="text-blue-400" />
                  <div>
                    <div className="text-xs text-gray-500">Webhook</div>
                    <div className="text-sm font-medium text-blue-400 truncate max-w-[180px]">
                      {monitor.webhook_url.includes("slack.com") ? "Slack" : monitor.webhook_url.includes("discord.com") ? "Discord" : "Custom"}
                    </div>
                  </div>
                </div>
              )}
              {monitor.keyword && (
                <div className="flex items-center gap-2">
                  <SearchCheck size={16} className="text-purple-400" />
                  <div>
                    <div className="text-xs text-gray-500">Keyword check</div>
                    <div className="text-sm font-medium text-purple-400 truncate max-w-[180px]">
                      &ldquo;{monitor.keyword}&rdquo;
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div className="ml-auto">
            <button
              onClick={copyBadge}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
            >
              {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy badge"}
            </button>
          </div>
        </div>

        {chartData.length > 0 && !isHeartbeat && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="font-semibold mb-4">Response Time (last 24h)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} unit="ms" width={55} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#9ca3af" }}
                  formatter={(val) => [val + "ms", "Response"]}
                />
                <Line type="monotone" dataKey="ms" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

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
