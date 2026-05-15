"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, RefreshCw, ChevronLeft, ChevronRight,
  PauseCircle, PlayCircle, Trash2, TrendingDown, CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

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
        <h1 className="text-2xl font-bold text-white">Alerts</h1>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>{total.toLocaleString()} total</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(["all", "active", "hit"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className="px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all dk-focus"
            style={filter === f
              ? { background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--lav)" }
              : { background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }
            }
          >
            {f}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto rounded-xl px-3 py-2 transition-colors dk-focus"
          style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="dk-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--lav)" }} />
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-center py-16 text-sm" style={{ color: "var(--text-faint)" }}>No alerts found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest" style={{ borderBottom: "1px solid var(--border-sm)", color: "var(--text-faint)" }}>
                <th className="text-left px-4 py-3 font-semibold">Product</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">User</th>
                <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">Target</th>
                <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">Now</th>
                <th className="text-center px-4 py-3 font-semibold hidden lg:table-cell">Last Hit</th>
                <th className="text-center px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const hit = a.current_price !== null && a.current_price <= a.target_price;
                return (
                  <tr key={a.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border-sm)" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {hit && <TrendingDown size={11} className="shrink-0" style={{ color: "var(--green)" }} />}
                        <p className="text-xs line-clamp-1" style={{ color: "var(--text-body)" }}>{a.product_title ?? "Unknown"}</p>
                      </div>
                      {hit && (
                        <span className="text-[8px] font-semibold flex items-center gap-0.5 mt-0.5" style={{ color: "var(--green)" }}>
                          <CheckCircle2 size={8} /> PRICE HIT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{a.user_email ?? "anon"}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs hidden sm:table-cell" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-body)" }}>
                      {fmt(a.target_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs hidden sm:table-cell" style={{ fontFamily: "'IBM Plex Mono', monospace", color: hit ? "var(--green)" : "var(--text-body)", fontWeight: hit ? 600 : 400 }}>
                      {fmt(a.current_price)}
                    </td>
                    <td className="px-4 py-3 text-center text-[10px] hidden lg:table-cell" style={{ color: "var(--text-faint)" }}>
                      {a.last_triggered
                        ? new Date(a.last_triggered).toLocaleDateString("en-BD", { month: "short", day: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toggle(a)}
                          disabled={busy === a.id}
                          className="p-1.5 rounded-lg transition-colors disabled:opacity-40 dk-focus"
                          style={{ color: "var(--text-faint)" }}
                          title={a.is_active ? "Pause" : "Resume"}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--amber)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
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
                          className="p-1.5 rounded-lg transition-colors disabled:opacity-40 dk-focus"
                          style={{ color: "var(--text-faint)" }}
                          title="Delete"
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
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
            className="flex items-center gap-1 px-3 py-2 rounded-xl transition-colors disabled:opacity-30 dk-focus"
            style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <span style={{ color: "var(--text-faint)" }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-xl transition-colors disabled:opacity-30 dk-focus"
            style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
