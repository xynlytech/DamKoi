"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, RefreshCw, ChevronLeft, ChevronRight,
  PauseCircle, PlayCircle, Trash2, TrendingDown, CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

type AlertRow = {
  id: string;
  user_email: string | null;
  product_title: string | null;
  product_id: string;
  target_price: number;
  current_price: number | null;
  is_active: boolean;
  notify_via: string[];
  last_triggered: string | null;
  created_at: string | null;
};

function fmt(p: number | null) {
  if (!p) return "—";
  return `৳${(p / 100).toLocaleString("en-BD")}`;
}

async function adminFetch(path: string, opts?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
      ...((opts?.headers as Record<string, string>) ?? {}),
    },
  });
}

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "active" | "hit">("all");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filter === "active") qs.set("active", "true");
      if (filter === "hit") qs.set("triggered", "true");
      const res = await adminFetch(`/admin/alerts?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.items);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (alert: AlertRow) => {
    setBusy(alert.id);
    try {
      const res = await adminFetch(`/admin/alerts/${alert.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !alert.is_active }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, is_active: !a.is_active } : a));
      }
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Permanently delete this alert?")) return;
    setBusy(id);
    try {
      const res = await adminFetch(`/admin/alerts/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        setTotal((t) => t - 1);
      }
    } finally {
      setBusy(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black font-outfit">Alerts</h1>
        <span className="text-xs text-white/30">{total.toLocaleString()} total</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(["all", "active", "hit"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              filter === f ? "nm-inset text-indigo-400" : "nm-raised text-white/40 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
        <button onClick={load} className="ml-auto nm-raised rounded-xl px-3 py-2 text-white/40 hover:text-white transition-colors">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="nm-raised rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin text-indigo-400" />
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-center text-white/30 py-16 text-sm">No alerts found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-white/30">
                <th className="text-left px-4 py-3 font-bold">Product</th>
                <th className="text-left px-4 py-3 font-bold hidden md:table-cell">User</th>
                <th className="text-right px-4 py-3 font-bold hidden sm:table-cell">Target</th>
                <th className="text-right px-4 py-3 font-bold hidden sm:table-cell">Now</th>
                <th className="text-center px-4 py-3 font-bold hidden lg:table-cell">Last Hit</th>
                <th className="text-center px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const hit = a.current_price !== null && a.current_price <= a.target_price;
                return (
                  <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {hit ? <TrendingDown size={11} className="text-emerald-400 shrink-0" /> : null}
                        <p className="text-white/70 text-xs line-clamp-1">{a.product_title ?? "Unknown"}</p>
                      </div>
                      {hit && (
                        <span className="text-[8px] font-black text-emerald-400 flex items-center gap-0.5 mt-0.5">
                          <CheckCircle2 size={8} /> PRICE HIT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[10px] text-white/40">{a.user_email ?? "anon"}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs hidden sm:table-cell">
                      {fmt(a.target_price)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-xs hidden sm:table-cell ${hit ? "text-emerald-400 font-bold" : ""}`}>
                      {fmt(a.current_price)}
                    </td>
                    <td className="px-4 py-3 text-center text-[10px] text-white/30 hidden lg:table-cell">
                      {a.last_triggered
                        ? new Date(a.last_triggered).toLocaleDateString("en-BD", { month: "short", day: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toggle(a)}
                          disabled={busy === a.id}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-amber-400 transition-colors disabled:opacity-40"
                          title={a.is_active ? "Pause" : "Resume"}
                        >
                          {busy === a.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : a.is_active ? (
                            <PauseCircle size={13} />
                          ) : (
                            <PlayCircle size={13} />
                          )}
                        </button>
                        <button
                          onClick={() => remove(a.id)}
                          disabled={busy === a.id}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-rose-400 transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 nm-raised rounded-xl text-white/40 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <span className="text-white/30">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-2 nm-raised rounded-xl text-white/40 hover:text-white disabled:opacity-30 transition-colors"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
