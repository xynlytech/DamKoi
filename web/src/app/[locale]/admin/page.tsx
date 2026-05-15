"use client";

import { useState, useEffect } from "react";
import {
  Package, Users, Bell, Tag, Database, Zap,
  TrendingUp, RefreshCw, Loader2, Activity,
  CheckCircle2, AlertTriangle, XCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

type Stats = {
  total_products: number;
  total_users: number;
  premium_users: number;
  active_alerts: number;
  total_alerts: number;
  push_subscriptions: number;
  active_coupons: number;
  snapshots_today: number;
};

type ScraperPlatform = {
  platform: string;
  status: "healthy" | "stale" | "dead" | "unknown";
  total_products: number;
  recently_scraped_6h: number;
  snaps_today: number;
  hours_since_last_scrape: number | null;
};

async function adminFetch(path: string) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
}

const STATUS_COLOR = {
  healthy: "var(--green)",
  stale:   "var(--amber)",
  dead:    "var(--red)",
  unknown: "var(--text-faint)",
};

function StatusIcon({ status }: { status: ScraperPlatform["status"] }) {
  const color = STATUS_COLOR[status];
  if (status === "healthy")  return <CheckCircle2 size={13} style={{ color }} />;
  if (status === "stale")    return <AlertTriangle size={13} style={{ color }} />;
  if (status === "dead")     return <XCircle size={13} style={{ color }} />;
  return <Activity size={13} style={{ color }} />;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [scrapers, setScrapers] = useState<ScraperPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, scraperRes] = await Promise.all([
        adminFetch("/admin/stats"),
        adminFetch("/admin/scrapers/health"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (scraperRes.ok) setScrapers(await scraperRes.json());
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => { load(); }, []);

  const healthyCount = scrapers.filter((s) => s.status === "healthy").length;
  const staleCount = scrapers.filter((s) => s.status === "stale").length;
  const deadCount = scrapers.filter((s) => s.status === "dead").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
            Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 dk-focus"
          style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--lav)" }} />
        </div>
      ) : stats ? (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Products",        value: stats.total_products,         icon: Package,    color: "#3b82f6" },
              { label: "Users",           value: stats.total_users,            sub: `${stats.premium_users} premium`, icon: Users, color: "var(--lav)" },
              { label: "Active Alerts",   value: stats.active_alerts,          sub: `${stats.total_alerts} total`, icon: Bell, color: "var(--amber)" },
              { label: "Push Subs",       value: stats.push_subscriptions,     icon: Zap,        color: "var(--lav)" },
              { label: "Coupons",         value: stats.active_coupons,         icon: Tag,        color: "var(--green)" },
              { label: "Snapshots Today", value: stats.snapshots_today,        icon: Database,   color: "#22d3ee" },
              { label: "Scrapers OK",     value: healthyCount,                 sub: `${staleCount} stale · ${deadCount} dead`, icon: Activity, color: deadCount > 0 ? "var(--red)" : staleCount > 0 ? "var(--amber)" : "var(--green)" },
              { label: "Alert Rate",      value: stats.total_alerts > 0 ? `${Math.round((stats.active_alerts / stats.total_alerts) * 100)}%` : "—", sub: "active / total", icon: TrendingUp, color: "var(--text-muted)" },
            ].map((s) => (
              <div key={s.label} className="dk-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{s.label}</p>
                  <s.icon size={13} style={{ color: s.color }} />
                </div>
                <p className="text-2xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{s.value}</p>
                {s.sub && <p className="text-[9px] mt-0.5" style={{ color: "var(--text-faint)" }}>{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Scraper status strip */}
          <div className="dk-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
              Scraper Health
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {scrapers.map((s) => (
                <div key={s.platform} className="rounded-xl p-3" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <StatusIcon status={s.status} />
                    <span className="text-[10px] font-medium capitalize text-white">{s.platform}</span>
                  </div>
                  <p className="text-lg font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{s.total_products}</p>
                  <p className="text-[9px]" style={{ color: "var(--text-faint)" }}>products</p>
                  <p className="text-[9px] mt-1" style={{ color: "var(--text-faint)" }}>
                    {s.hours_since_last_scrape != null ? `${s.hours_since_last_scrape}h ago` : "never"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
