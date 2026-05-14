"use client";

import { useState, useEffect } from "react";
import {
  Package, Users, Bell, Tag, Database, Zap,
  TrendingUp, RefreshCw, Loader2, Activity,
  CheckCircle2, AlertTriangle, XCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

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

const STATUS_ICON = {
  healthy: <CheckCircle2 size={13} className="text-emerald-400" />,
  stale: <AlertTriangle size={13} className="text-amber-400" />,
  dead: <XCircle size={13} className="text-rose-400" />,
  unknown: <Activity size={13} className="text-white/20" />,
};

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
          <h1 className="text-2xl font-black font-outfit">Overview</h1>
          <p className="text-white/30 text-xs mt-0.5">
            Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl nm-raised text-xs font-bold text-white/40 hover:text-white transition-colors disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : stats ? (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Products", value: stats.total_products, icon: Package, color: "text-blue-400" },
              { label: "Users", value: stats.total_users, sub: `${stats.premium_users} premium`, icon: Users, color: "text-purple-400" },
              { label: "Active Alerts", value: stats.active_alerts, sub: `${stats.total_alerts} total`, icon: Bell, color: "text-amber-400" },
              { label: "Push Subs", value: stats.push_subscriptions, icon: Zap, color: "text-indigo-400" },
              { label: "Coupons", value: stats.active_coupons, icon: Tag, color: "text-emerald-400" },
              { label: "Snapshots Today", value: stats.snapshots_today, icon: Database, color: "text-teal-400" },
              { label: "Scrapers OK", value: healthyCount, sub: `${staleCount} stale · ${deadCount} dead`, icon: Activity, color: healthyCount === scrapers.length ? "text-emerald-400" : deadCount > 0 ? "text-rose-400" : "text-amber-400" },
              { label: "Alert Rate", value: stats.total_alerts > 0 ? `${Math.round((stats.active_alerts / stats.total_alerts) * 100)}%` : "—", sub: "active / total", icon: TrendingUp, color: "text-white/60" },
            ].map((s) => (
              <div key={s.label} className="nm-raised rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">{s.label}</p>
                  <s.icon size={13} className={s.color} />
                </div>
                <p className="text-2xl font-black font-mono">{s.value}</p>
                {s.sub && <p className="text-[9px] text-white/20 mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Scraper status strip */}
          <div className="nm-raised rounded-2xl p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">
              Scraper Health
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {scrapers.map((s) => (
                <div key={s.platform} className="nm-inset rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {STATUS_ICON[s.status]}
                    <span className="text-[10px] font-bold capitalize">{s.platform}</span>
                  </div>
                  <p className="text-lg font-black font-mono">{s.total_products}</p>
                  <p className="text-[9px] text-white/30">products</p>
                  <p className="text-[9px] text-white/20 mt-1">
                    {s.hours_since_last_scrape != null
                      ? `${s.hours_since_last_scrape}h ago`
                      : "never"}
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
