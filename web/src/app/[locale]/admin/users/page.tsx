"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Star, RefreshCw, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

type UserRow = {
  id: string;
  email: string | null;
  auth_provider: string | null;
  is_premium: boolean;
  is_admin: boolean;
  alert_count: number;
  active_alert_count: number;
  created_at: string | null;
};

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (premiumOnly) qs.set("premium", "true");
      const res = await adminFetch(`/admin/users?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.items);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, premiumOnly]);

  useEffect(() => { load(); }, [load]);

  const togglePremium = async (user: UserRow) => {
    setToggling(user.id);
    try {
      const res = await adminFetch(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_premium: !user.is_premium }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_premium: !u.is_premium } : u));
      }
    } finally {
      setToggling(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>{total.toLocaleString()} total</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setPremiumOnly((p) => !p); setPage(1); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all dk-focus"
          style={premiumOnly
            ? { background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "var(--amber)" }
            : { background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }
          }
        >
          <Star size={12} /> Premium only
        </button>
        <button
          onClick={load}
          className="rounded-xl px-3 py-2 transition-colors dk-focus"
          style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="dk-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--lav)" }} />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center py-16 text-sm" style={{ color: "var(--text-faint)" }}>No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest" style={{ borderBottom: "1px solid var(--border-sm)", color: "var(--text-faint)" }}>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Provider</th>
                <th className="text-center px-4 py-3 font-semibold hidden sm:table-cell">Alerts</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Joined</th>
                <th className="text-center px-4 py-3 font-semibold">Premium</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border-sm)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs" style={{ color: "var(--text-body)" }}>
                        {u.email ?? <span className="italic" style={{ color: "var(--text-faint)" }}>anonymous</span>}
                      </p>
                      {u.is_admin && (
                        <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full uppercase" style={{ color: "var(--red)", background: "rgba(239,68,68,0.1)" }}>
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] mt-0.5" style={{ color: "var(--text-faint)", fontFamily: "'IBM Plex Mono', monospace" }}>{u.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-[10px] capitalize" style={{ color: "var(--text-faint)" }}>{u.auth_provider ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{u.active_alert_count}</span>
                    <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>/{u.alert_count}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "2-digit" }) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePremium(u)}
                      disabled={toggling === u.id}
                      className="inline-flex items-center gap-1 text-[10px] font-medium transition-colors disabled:opacity-40 dk-focus"
                    >
                      {toggling === u.id ? (
                        <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-faint)" }} />
                      ) : u.is_premium ? (
                        <ToggleRight size={18} style={{ color: "var(--amber)" }} />
                      ) : (
                        <ToggleLeft size={18} style={{ color: "var(--text-faint)" }} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
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
