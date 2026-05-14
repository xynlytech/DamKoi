"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Star, RefreshCw, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

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
        <h1 className="text-2xl font-black font-outfit">Users</h1>
        <span className="text-xs text-white/30">{total.toLocaleString()} total</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setPremiumOnly((p) => !p); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            premiumOnly ? "nm-inset text-amber-400" : "nm-raised text-white/40 hover:text-white"
          }`}
        >
          <Star size={12} /> Premium only
        </button>
        <button onClick={load} className="nm-raised rounded-xl px-3 py-2 text-white/40 hover:text-white transition-colors">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="nm-raised rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin text-indigo-400" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-white/30 py-16 text-sm">No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-white/30">
                <th className="text-left px-4 py-3 font-bold">Email</th>
                <th className="text-left px-4 py-3 font-bold hidden md:table-cell">Provider</th>
                <th className="text-center px-4 py-3 font-bold hidden sm:table-cell">Alerts</th>
                <th className="text-left px-4 py-3 font-bold hidden lg:table-cell">Joined</th>
                <th className="text-center px-4 py-3 font-bold">Premium</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-white/70 text-xs">{u.email ?? <span className="text-white/20 italic">anonymous</span>}</p>
                      {u.is_admin && (
                        <span className="text-[8px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full uppercase">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-white/20 font-mono mt-0.5">{u.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-[10px] text-white/30 capitalize">{u.auth_provider ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="text-xs font-mono">{u.active_alert_count}</span>
                    <span className="text-[9px] text-white/20">/{u.alert_count}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-[10px] text-white/30">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "2-digit" }) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePremium(u)}
                      disabled={toggling === u.id}
                      className="inline-flex items-center gap-1 text-[10px] font-bold transition-colors disabled:opacity-40"
                    >
                      {toggling === u.id ? (
                        <Loader2 size={14} className="animate-spin text-white/30" />
                      ) : u.is_premium ? (
                        <ToggleRight size={18} className="text-amber-400" />
                      ) : (
                        <ToggleLeft size={18} className="text-white/20 hover:text-white/50" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
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
