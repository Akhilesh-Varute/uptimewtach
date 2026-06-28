"use client";

import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { Monitor } from "@/lib/supabase";

type Props = {
  onClose: () => void;
  onAdded: (monitor: Monitor) => void;
};

type MonitorType = "http" | "tcp" | "heartbeat";

export default function AddMonitorModal({ onClose, onAdded }: Props) {
  const [name, setName] = useState("");
  const [monitorType, setMonitorType] = useState<MonitorType>("http");
  const [url, setUrl] = useState("https://");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [heartbeatInterval, setHeartbeatInterval] = useState("300");
  const [heartbeatGrace, setHeartbeatGrace] = useState("300");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let body: Record<string, unknown>;
      if (monitorType === "heartbeat") {
        body = {
          name,
          monitor_type: "heartbeat",
          interval_seconds: parseInt(heartbeatInterval, 10) || 300,
          heartbeat_grace_seconds: parseInt(heartbeatGrace, 10) || 300,
          webhook_url: webhookUrl.trim() || undefined,
        };
      } else if (monitorType === "tcp") {
        body = {
          name,
          monitor_type: "tcp",
          host: host.trim(),
          port: parseInt(port, 10),
          webhook_url: webhookUrl.trim() || undefined,
        };
      } else {
        body = {
          name,
          monitor_type: "http",
          url,
          webhook_url: webhookUrl.trim() || undefined,
          keyword: keyword.trim() || undefined,
        };
      }

      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create monitor"); return; }
      onAdded(data);
    } finally {
      setLoading(false);
    }
  }

  const tabs: { key: MonitorType; label: string }[] = [
    { key: "http", label: "HTTP(S)" },
    { key: "tcp", label: "TCP / Port" },
    { key: "heartbeat", label: "Heartbeat" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Add Monitor</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="flex rounded-lg border border-gray-700 overflow-hidden text-sm">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setMonitorType(t.key)}
                className={"flex-1 py-2 font-medium transition-colors " + (monitorType === t.key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200")}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={monitorType === "tcp" ? "My Database" : monitorType === "heartbeat" ? "My Cron Job" : "My Website"}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {monitorType === "http" && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {monitorType === "tcp" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">Host</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="db.example.com"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm text-gray-400 mb-1">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="5432"
                  min={1}
                  max={65535}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {monitorType === "heartbeat" && (
            <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-3 text-sm text-blue-300">
              After creating, you&apos;ll get a unique ping URL. Call it from your cron job or script. If we don&apos;t receive a ping within the expected interval + grace period, we&apos;ll alert you.
            </div>
          )}

          {monitorType === "heartbeat" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">Expected interval</label>
                <select
                  value={heartbeatInterval}
                  onChange={(e) => setHeartbeatInterval(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="60">Every minute</option>
                  <option value="300">Every 5 min</option>
                  <option value="600">Every 10 min</option>
                  <option value="1800">Every 30 min</option>
                  <option value="3600">Every hour</option>
                  <option value="86400">Every day</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">Grace period</label>
                <select
                  value={heartbeatGrace}
                  onChange={(e) => setHeartbeatGrace(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="60">1 min</option>
                  <option value="300">5 min</option>
                  <option value="600">10 min</option>
                  <option value="1800">30 min</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
          >
            <ChevronDown
              size={15}
              className={"transition-transform " + (showAdvanced ? "rotate-180" : "")}
            />
            Advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-4 border border-gray-800 rounded-lg p-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Webhook URL
                  <span className="ml-2 text-xs text-gray-600">Slack, Discord, or any webhook</span>
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              {monitorType === "http" && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Keyword check
                    <span className="ml-2 text-xs text-gray-600">optional</span>
                  </label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder='e.g. "Welcome" or "status: ok"'
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Mark as down if this text is missing from the response body
                  </p>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 py-2 rounded-lg text-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? "Adding..." : "Add Monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
