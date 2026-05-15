"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, HelpCircle, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

type PlatformHealth = {
  platform: string;
  status: "healthy" | "stale" | "dead" | "unknown";
  total_products: number;
  recently_scraped_6h: number;
  snaps_today: number;
  last_scraped_at: string | null;
  hours_since_last_scrape: number | null;
};

const STATUS_CONFIG = {
  healthy: { icon: CheckCircle,   color: "var(--green)", borderColor: "rgba(34,197,94,0.2)",   bgColor: "rgba(34,197,94,0.06)",   label: "Healthy" },
  stale:   { icon: AlertTriangle, color: "var(--amber)", borderColor: "rgba(245,158,11,0.2)",  bgColor: "rgba(245,158,11,0.06)",  label: "Stale"   },
  dead:    { icon: XCircle,       color: "var(--red)",   borderColor: "rgba(239,68,68,0.2)",   bgColor: "rgba(239,68,68,0.06)",   label: "Dead"    },
  unknown: { icon: HelpCircle,    color: "var(--text-faint)", borderColor: "var(--border-sm)", bgColor: "var(--surface-ghost)", label: "Unknown" },
};

const PLATFORM_COLOR: Record<string, string> = {
  daraz: "#f97316", cartup: "#3b82f6", rokomari: "#ef4444",
  pickaboo: "#8b5cf6", chaldal: "#22c55e", othoba: "#ec4899",
};

function fmt(n: number) { return n.toLocaleString("en-BD"); }

function fmtTime(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function adminFetch(path: string) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
}

export default function ScraperHealthPage() {
  const [data, setData] = useState<PlatformHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await adminFetch("/admin/scrapers/health");
      if (res.ok) { setData(await res.json()); setLastRefreshed(new Date()); }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const healthy = data.filter((p) => p.status === "healthy").length;
  const stale   = data.filter((p) => p.status === "stale").length;
  const dead    = data.filter((p) => p.status === "dead").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity size={22} style={{ color: "var(--lav)" }} />
            Scraper Health
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
            {lastRefreshed ? `Last refreshed ${lastRefreshed.toLocaleTimeString("en-BD")}` : "Loading…"}
            {" · "}Auto-refreshes every 60s
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 dk-focus"
          style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Healthy", count: healthy, color: "var(--green)",  bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.2)"  },
          { label: "Stale",   count: stale,   color: "var(--amber)",  bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
          { label: "Dead",    count: dead,    color: "var(--red)",    bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)"  },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-5" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <p className="text-3xl font-bold" style={{ color: s.color, fontFamily: "'IBM Plex Mono', monospace" }}>{s.count}</p>
            <p className="text-xs font-semibold uppercase tracking-widest mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Platform cards */}
      {loading ? (
        <div className="text-center py-20" style={{ color: "var(--text-faint)" }}>
          <RefreshCw size={32} className="animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold uppercase tracking-widest">Loading scraper status…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {data.map((p) => {
            const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.unknown;
            const Icon = cfg.icon;
            const coveragePct = p.total_products > 0
              ? Math.round((p.recently_scraped_6h / p.total_products) * 100)
              : 0;
            const barColor = coveragePct >= 70 ? "var(--green)" : coveragePct >= 30 ? "var(--amber)" : "var(--red)";

            return (
              <div key={p.platform} className="rounded-2xl p-5" style={{ background: cfg.bgColor, border: `1px solid ${cfg.borderColor}` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full" style={{ color: PLATFORM_COLOR[p.platform] ?? "var(--text-muted)", background: "var(--surface-ghost)" }}>
                      {p.platform}
                    </span>
                    <div className="flex items-center gap-1.5" style={{ color: cfg.color }}>
                      <Icon size={14} />
                      <span className="text-xs font-semibold">{cfg.label}</span>
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-faint)", fontFamily: "'IBM Plex Mono', monospace" }}>
                    {p.hours_since_last_scrape !== null ? `${p.hours_since_last_scrape}h ago` : "never scraped"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Stat label="Total Products" value={fmt(p.total_products)} />
                  <Stat label="Scraped (6h)" value={fmt(p.recently_scraped_6h)} sub={`${coveragePct}% coverage`} />
                  <Stat label="Snaps Today" value={fmt(p.snaps_today)} />
                  <Stat label="Last Scrape" value={fmtTime(p.last_scraped_at)} small />
                </div>

                <div className="mt-4">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-ghost)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(coveragePct, 100)}%`, background: barColor }} />
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>{coveragePct}% of products scraped in last 6h</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div>
      <p className={`font-bold ${small ? "text-sm" : "text-xl"} text-white`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: "var(--text-faint)" }}>{label}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{sub}</p>}
    </div>
  );
}
