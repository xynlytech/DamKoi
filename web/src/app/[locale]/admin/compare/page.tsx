"use client";

import { useState, useEffect, useCallback } from "react";
import { GitMerge, GitBranch, AlertCircle, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

const PLATFORM_COLOR: Record<string, string> = {
  daraz: "#f97316", cartup: "#3b82f6", rokomari: "#ef4444",
  pickaboo: "#8b5cf6", chaldal: "#22c55e", othoba: "#ec4899",
};

type Product = {
  id: string;
  title: string;
  platform: string;
  url: string;
  image_url: string;
};

type MatchGroup = {
  id: string;
  name: string;
  product_count: number;
  products: Product[];
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

export default function AdminComparePage() {
  const [groups, setGroups] = useState<MatchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [mergeTargetGroup, setMergeTargetGroup] = useState<string | null>(null);
  const [mergeProductId, setMergeProductId] = useState("");

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/admin/match-groups");
      if (res.ok) setGroups(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { fetchGroups(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchGroups]);

  const handleSplit = async (productId: string) => {
    setActionStatus(null);
    try {
      const res = await adminFetch("/admin/match-groups/split", {
        method: "POST",
        body: JSON.stringify({ product_ids: [productId] }),
      });
      setActionStatus(res.ok
        ? { msg: "Split successful", type: "ok" }
        : { msg: "Split failed", type: "err" }
      );
      if (res.ok) fetchGroups();
    } catch {
      setActionStatus({ msg: "Network error during split", type: "err" });
    }
  };

  const handleMerge = async (groupId: string) => {
    if (!mergeProductId) return;
    setActionStatus(null);
    try {
      const res = await adminFetch(`/admin/match-groups/${groupId}/merge`, {
        method: "POST",
        body: JSON.stringify({ product_ids: [mergeProductId] }),
      });
      if (res.ok) {
        setActionStatus({ msg: "Merge successful", type: "ok" });
        setMergeProductId(""); setMergeTargetGroup(null);
        fetchGroups();
      } else {
        setActionStatus({ msg: "Merge failed. Check product ID.", type: "err" });
      }
    } catch {
      setActionStatus({ msg: "Network error during merge", type: "err" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <GitMerge size={22} style={{ color: "var(--lav)" }} />
            Match Groups
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>Cross-platform product matching moderation</p>
        </div>
        <button
          onClick={fetchGroups}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all dk-focus"
          style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
        </button>
      </div>

      {actionStatus && (
        <div className="p-4 rounded-xl flex items-center gap-3" style={{
          background: actionStatus.type === "ok" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${actionStatus.type === "ok" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
          color: actionStatus.type === "ok" ? "var(--green)" : "var(--red)",
        }}>
          {actionStatus.type === "ok" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="font-semibold text-sm">{actionStatus.msg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--lav)" }} />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.id} className="dk-card overflow-hidden">
              {/* Group header */}
              <div className="p-4 flex items-center justify-between" style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border-sm)" }}>
                <div>
                  <h2 className="font-bold text-base text-white">{group.name}</h2>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)", fontFamily: "'IBM Plex Mono', monospace" }}>ID: {group.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(124,58,237,0.15)", color: "var(--lav)", border: "1px solid rgba(124,58,237,0.25)" }}>
                    {group.product_count} Products
                  </span>
                  <button
                    onClick={() => setMergeTargetGroup(mergeTargetGroup === group.id ? null : group.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all dk-focus"
                    style={{ background: "var(--border-sm)", color: "var(--text-body)" }}
                  >
                    <GitMerge size={14} /> Merge Into Group
                  </button>
                </div>
              </div>

              {mergeTargetGroup === group.id && (
                <div className="p-4 flex items-center gap-3" style={{ background: "rgba(124,58,237,0.05)", borderBottom: "1px solid var(--border-sm)" }}>
                  <input
                    type="text"
                    placeholder="Paste internal Product ID to inject…"
                    className="dk-input flex-1 font-mono text-sm"
                    value={mergeProductId}
                    onChange={(e) => setMergeProductId(e.target.value)}
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                  <button
                    onClick={() => handleMerge(group.id)}
                    className="dk-btn-primary text-xs uppercase tracking-widest"
                  >
                    Execute Merge
                  </button>
                </div>
              )}

              <div className="p-4 space-y-3">
                {group.products.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl transition-all" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-sm)" }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: "var(--bg3)" }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: PLATFORM_COLOR[p.platform] ?? "var(--text-muted)" }}>{p.platform}</div>
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-secondary)" }}>{p.title}</p>
                      <p className="text-[9px] mt-1" style={{ color: "var(--text-faint)", fontFamily: "'IBM Plex Mono', monospace" }}>{p.id}</p>
                    </div>
                    <button
                      onClick={() => handleSplit(p.id)}
                      className="p-2 rounded-lg transition-all dk-focus"
                      style={{ color: "var(--red)" }}
                      title="Split from group"
                    >
                      <GitBranch size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
