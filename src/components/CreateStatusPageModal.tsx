"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Monitor } from "@/lib/supabase";

type Props = {
  monitors: Monitor[];
  onClose: () => void;
  onCreated?: (sp: { id: string; title: string; slug: string }) => void;
};

export default function CreateStatusPageModal({ monitors, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  function toggleMonitor(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/status-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, description, monitor_ids: selected }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      onCreated?.({ id: data.id, title, slug: data.slug });
      setCreated(slug);
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    const url = `${window.location.origin}/status/${created}`;
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6 text-center">
          <div className="text-green-400 text-4xl mb-4">✓</div>
          <h2 className="text-lg font-semibold mb-2">Status page created!</h2>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all text-sm">{url}</a>
          <div className="mt-6">
            <button onClick={onClose} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Create Status Page</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Acme Status" required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Slug (URL)</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">/status/</span>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="acme" required className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Live status for all services" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          {monitors.length > 0 && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Include monitors</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {monitors.map((m) => (
                  <label key={m.id} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleMonitor(m.id)} className="rounded" />
                    <span className="text-sm">{m.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 py-2 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">{loading ? "Creating..." : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
