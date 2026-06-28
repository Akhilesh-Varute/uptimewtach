"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, Plus, Trash2, Copy, Check, Key } from "lucide-react";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
};

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/keys")
      .then((r) => r.json())
      .then((d) => { setKeys(d.keys ?? []); setLoading(false); });
  }, []);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName || "My API Key" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create key"); return; }
      setRevealed(data.key);
      setKeys((prev) => [{ id: data.id, name: data.name, key_prefix: data.key_prefix, created_at: data.created_at, last_used_at: null }, ...prev]);
      setNewKeyName("");
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey(id: string) {
    await fetch("/api/v1/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  function copyKey() {
    if (!revealed) return;
    navigator.clipboard.writeText(revealed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Key size={22} className="text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold">API Keys</h1>
            <p className="text-gray-400 text-sm">Use these keys to access the UptimeWatch REST API</p>
          </div>
        </div>

        {/* New key revealed */}
        {revealed && (
          <div className="bg-green-950 border border-green-700 rounded-xl p-4 mb-6">
            <p className="text-green-400 text-sm font-medium mb-2">Key created — copy it now, it won&apos;t be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono text-green-300 break-all">{revealed}</code>
              <button onClick={copyKey} className="shrink-0 p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
            <button onClick={() => setRevealed(null)} className="mt-3 text-xs text-gray-500 hover:text-gray-300">Dismiss</button>
          </div>
        )}

        {/* Create form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4">Create new key</h2>
          <form onSubmit={createKey} className="flex gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. My App)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 shrink-0"
            >
              <Plus size={15} />
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        {/* Key list */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 text-sm text-gray-400 font-medium">
            {loading ? "Loading..." : keys.length === 0 ? "No API keys yet" : `${keys.length} key${keys.length === 1 ? "" : "s"}`}
          </div>
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-5 py-4 border-b border-gray-800 last:border-0">
              <div>
                <div className="font-medium text-sm">{k.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  <code className="text-gray-400">{k.key_prefix}...</code>
                  <span className="mx-2">·</span>
                  Created {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used_at && (
                    <><span className="mx-2">·</span>Last used {new Date(k.last_used_at).toLocaleDateString()}</>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteKey(k.id)}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* Docs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-6">
          <h2 className="font-semibold mb-3">Usage</h2>
          <p className="text-gray-400 text-sm mb-3">Pass your key as a Bearer token in the Authorization header:</p>
          <pre className="bg-gray-950 rounded-lg p-3 text-sm text-gray-300 overflow-x-auto">
{`# List all monitors
curl https://uptimewatch.io/api/v1/monitors \\
  -H "Authorization: Bearer uw_..."

# Get a single monitor with uptime stats
curl https://uptimewatch.io/api/v1/monitors/{id} \\
  -H "Authorization: Bearer uw_..."`}
          </pre>
        </div>
      </main>
    </div>
  );
}
