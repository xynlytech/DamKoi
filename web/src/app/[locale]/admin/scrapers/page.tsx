"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || "damkoi-admin-secret-dev";

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
  healthy: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Healthy" },
  stale:   { icon: AlertTriangle, color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",   label: "Stale" },
  dead:    { icon: XCircle,       color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",        label: "Dead" },
  unknown: { icon: HelpCircle,    color: "text-white/30",   bg: "bg-white/5 border-white/10",             label: "Unknown" },
};

const PLATFORM_COLOR: Record<string, string> = {
  daraz:    "text-orange-400",
  cartup:   "text-blue-400",
  rokomari: "text-green-400",
  pickaboo: "text-purple-400",
  chaldal:  "text-teal-400",
  othoba:   "text-rose-400",
};

function fmt(n: number) {
  return n.toLocaleString("en-BD");
}

function fmtTime(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-BD", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
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
      const res = await fetch(`${API}/admin/scrapers/health`, {
        headers: { "x-admin-token": ADMIN_TOKEN },
      });
      if (!res.ok) throw new Error("Unauthorized or server error");
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 60_000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [load]);

  const healthy = data.filter((p) => p.status === "healthy").length;
  const stale   = data.filter((p) => p.status === "stale").length;
  const dead    = data.filter((p) => p.status === "dead").length;

  return (
    <div className="container mx-auto px-4 max-w-5xl py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black font-outfit mb-1">🕷 Scraper Health</h1>
          <p className="text-white/30 text-sm">
            {lastRefreshed ? `Last refreshed ${lastRefreshed.toLocaleTimeString("en-BD")}` : "Loading…"}
            {" · "}Auto-refreshes every 60s
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Healthy", count: healthy, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Stale",   count: stale,   color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Dead",    count: dead,    color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-5 ${s.bg}`}>
            <p className={`text-3xl font-black font-mono ${s.color}`}>{s.count}</p>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Platform cards */}
      {loading ? (
        <div className="text-center py-20 text-white/20">
          <RefreshCw size={32} className="animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold uppercase tracking-widest">Loading scraper status…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {data.map((p) => {
            const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.unknown;
            const Icon = cfg.icon;
            const coveragePct = p.total_products > 0
              ? Math.round((p.recently_scraped_6h / p.total_products) * 100)
              : 0;

            return (
              <div key={p.platform} className={`nm-raised rounded-2xl p-5 border ${cfg.bg}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 ${PLATFORM_COLOR[p.platform] ?? "text-white/40"}`}>
                      {p.platform}
                    </span>
                    <div className={`flex items-center gap-1.5 ${cfg.color}`}>
                      <Icon size={14} />
                      <span className="text-xs font-bold">{cfg.label}</span>
                    </div>
                  </div>
                  <span className="text-white/20 text-xs font-mono">
                    {p.hours_since_last_scrape !== null
                      ? `${p.hours_since_last_scrape}h ago`
                      : "never scraped"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Stat label="Total Products" value={fmt(p.total_products)} />
                  <Stat label="Scraped (6h)" value={fmt(p.recently_scraped_6h)} sub={`${coveragePct}% coverage`} />
                  <Stat label="Snaps Today" value={fmt(p.snaps_today)} />
                  <Stat label="Last Scrape" value={fmtTime(p.last_scraped_at)} small />
                </div>

                {/* Coverage bar */}
                <div className="mt-4">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        coveragePct >= 70 ? "bg-emerald-500" :
                        coveragePct >= 30 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(coveragePct, 100)}%` }}
                    />
                  </div>
                  <p className="text-white/20 text-[10px] mt-1">{coveragePct}% of products scraped in last 6h</p>
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
      <p className={`font-black font-mono ${small ? "text-sm" : "text-xl"} text-white`}>{value}</p>
      <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">{label}</p>
      {sub && <p className="text-white/20 text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}
