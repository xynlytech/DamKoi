"use client";

import { useState, useEffect } from "react";
import {
  Package, Users, Bell, Tag, Database, Zap,
  TrendingUp, RefreshCw, Loader2, Activity,
  CheckCircle2, AlertTriangle, XCircle, HardDrive, BarChart3,
  Send, Trophy, Target, MessageCircle,
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

type DbAnalytics = {
  table_counts: Record<string, number>;
  catalog: {
    total: number;
    priced: number;
    stubs: number;
    added_today: number;
    added_7d: number;
  };
  platforms: { platform: string; total: number; priced: number; stubs: number }[];
  snapshot_trend: { date: string; count: number }[];
  table_sizes: { table: string; size: string; size_bytes: number }[];
  total_db_size: string;
  total_db_size_bytes: number;
  supabase_free_limit_bytes: number;
  supabase_usage_pct: number;
};

type Growth = {
  users_trend: { date: string; count: number }[];
  alerts_trend: { date: string; count: number }[];
  notifications_trend: { date: string; count: number }[];
  top_alerted_products: { id: string; title: string; platform: string; alert_count: number }[];
  engagement: {
    telegram_linked: number;
    users_with_active_alerts: number;
    alerts_hitting_target: number;
    alerts_with_price: number;
    hit_rate_pct: number;
    ever_triggered_count: number;
  };
  total_notifications_sent: number;
};

async function adminFetch(path: string) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
}

const PLATFORM_COLOR: Record<string, string> = {
  daraz: "#f97316", cartup: "#3b82f6", rokomari: "#ef4444",
  pickaboo: "#8b5cf6", chaldal: "#22c55e", othoba: "#ec4899",
};

function MiniBarChart({ data, color, height = 48 }: {
  data: { date: string; count: number }[];
  color: string;
  height?: number;
}) {
  if (!data.length) return <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>No data yet.</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div
            className="w-full rounded-sm"
            style={{
              height: `${Math.max((d.count / max) * (height - 12), 2)}px`,
              background: color,
              opacity: 0.75,
              transition: "opacity 0.1s",
            }}
            title={`${d.date}: ${d.count}`}
          />
          {data.length <= 14 && (
            <span className="text-[7px]" style={{ color: "var(--text-ghost)" }}>
              {new Date(d.date + "T00:00:00").toLocaleDateString("en", { day: "numeric" })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
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
  const [dbAnalytics, setDbAnalytics] = useState<DbAnalytics | null>(null);
  const [growth, setGrowth] = useState<Growth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, scraperRes, dbRes, growthRes] = await Promise.all([
        adminFetch("/admin/stats"),
        adminFetch("/admin/scrapers/health"),
        adminFetch("/admin/db-analytics"),
        adminFetch("/admin/growth"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (scraperRes.ok) setScrapers(await scraperRes.json());
      if (dbRes.ok) setDbAnalytics(await dbRes.json());
      if (growthRes.ok) setGrowth(await growthRes.json());
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

          {/* DB Analytics */}
          {dbAnalytics && (
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Database Analytics
              </h2>

              {/* Catalog quality + Supabase storage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Catalog breakdown */}
                <div className="dk-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Package size={13} style={{ color: "#3b82f6" }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Catalog Quality</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Total Products", value: dbAnalytics.catalog.total, color: "var(--text-main)" },
                      { label: "Priced (real data)", value: dbAnalytics.catalog.priced, color: "var(--green)" },
                      { label: "Stubs (no price yet)", value: dbAnalytics.catalog.stubs, color: "var(--amber)" },
                      { label: "Added Today", value: dbAnalytics.catalog.added_today, color: "#22d3ee" },
                      { label: "Added Last 7d", value: dbAnalytics.catalog.added_7d, color: "var(--lav)" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{row.label}</span>
                        <span className="text-sm font-bold" style={{ color: row.color, fontFamily: "'IBM Plex Mono', monospace" }}>{row.value.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((dbAnalytics.catalog.priced / Math.max(dbAnalytics.catalog.total, 1)) * 100)}%`,
                          background: "var(--green)"
                        }}
                      />
                    </div>
                    <p className="text-[9px]" style={{ color: "var(--text-faint)" }}>
                      {Math.round((dbAnalytics.catalog.priced / Math.max(dbAnalytics.catalog.total, 1)) * 100)}% priced
                    </p>
                  </div>
                </div>

                {/* Supabase storage */}
                <div className="dk-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <HardDrive size={13} style={{ color: "var(--lav)" }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Storage (Supabase Free 500MB)</span>
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{dbAnalytics.total_db_size}</p>
                  <p className="text-[10px] mb-3" style={{ color: "var(--text-faint)" }}>{dbAnalytics.supabase_usage_pct}% of 500MB used</p>
                  <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: "var(--bg2)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(dbAnalytics.supabase_usage_pct, 100)}%`,
                        background: dbAnalytics.supabase_usage_pct > 80 ? "var(--red)" : dbAnalytics.supabase_usage_pct > 60 ? "var(--amber)" : "var(--green)"
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    {dbAnalytics.table_sizes.slice(0, 5).map((t) => (
                      <div key={t.table} className="flex items-center justify-between">
                        <span className="text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>{t.table}</span>
                        <span className="text-[10px] font-mono text-white">{t.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Snapshot trend (last 7 days) */}
              <div className="dk-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={13} style={{ color: "#22d3ee" }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Price Snapshots — Last 7 Days</span>
                </div>
                {dbAnalytics.snapshot_trend.length > 0 ? (
                  <div className="flex items-end gap-1.5 h-16">
                    {(() => {
                      const max = Math.max(...dbAnalytics.snapshot_trend.map((d) => d.count), 1);
                      return dbAnalytics.snapshot_trend.map((d) => (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t"
                            style={{
                              height: `${Math.max((d.count / max) * 52, 4)}px`,
                              background: "var(--lav)",
                              opacity: 0.8,
                            }}
                          />
                          <span className="text-[8px]" style={{ color: "var(--text-faint)" }}>
                            {new Date(d.date).toLocaleDateString("en", { weekday: "short" })}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>No snapshot data yet.</p>
                )}
              </div>

              {/* Per-platform table */}
              <div className="dk-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={13} style={{ color: "var(--amber)" }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Catalog by Platform</span>
                </div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr style={{ color: "var(--text-faint)" }}>
                      <th className="text-left pb-2">Platform</th>
                      <th className="text-right pb-2">Total</th>
                      <th className="text-right pb-2">Priced</th>
                      <th className="text-right pb-2">Stubs</th>
                      <th className="text-right pb-2">% Ready</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbAnalytics.platforms.map((p) => (
                      <tr key={p.platform} style={{ borderTop: "1px solid var(--border-sm)" }}>
                        <td className="py-1.5 capitalize text-white font-medium">{p.platform}</td>
                        <td className="text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.total.toLocaleString()}</td>
                        <td className="text-right" style={{ color: "var(--green)", fontFamily: "'IBM Plex Mono', monospace" }}>{p.priced.toLocaleString()}</td>
                        <td className="text-right" style={{ color: "var(--amber)", fontFamily: "'IBM Plex Mono', monospace" }}>{p.stubs.toLocaleString()}</td>
                        <td className="text-right" style={{ color: "var(--text-faint)" }}>
                          {Math.round((p.priced / Math.max(p.total, 1)) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* All table row counts */}
              <div className="dk-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Database size={13} style={{ color: "#22d3ee" }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Table Row Counts</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(dbAnalytics.table_counts).map(([table, count]) => (
                    <div key={table} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "var(--bg2)" }}>
                      <span className="text-[9px] font-mono" style={{ color: "var(--text-faint)" }}>{table}</span>
                      <span className="text-[10px] font-bold font-mono text-white">{Number(count).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Growth Trends */}
          {growth && (
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Growth — Last 30 Days
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="dk-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={12} style={{ color: "var(--lav)" }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>New Users</span>
                    <span className="ml-auto text-sm font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {growth.users_trend.reduce((s, d) => s + d.count, 0)}
                    </span>
                  </div>
                  <MiniBarChart data={growth.users_trend} color="var(--lav)" />
                </div>

                <div className="dk-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell size={12} style={{ color: "var(--amber)" }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Alerts Created</span>
                    <span className="ml-auto text-sm font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {growth.alerts_trend.reduce((s, d) => s + d.count, 0)}
                    </span>
                  </div>
                  <MiniBarChart data={growth.alerts_trend} color="var(--amber)" />
                </div>

                <div className="dk-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Send size={12} style={{ color: "var(--green)" }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Notifications Sent</span>
                    <span className="ml-auto text-sm font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {growth.notifications_trend.reduce((s, d) => s + d.count, 0)}
                    </span>
                  </div>
                  <MiniBarChart data={growth.notifications_trend} color="var(--green)" />
                </div>
              </div>

              {/* Engagement KPIs */}
              <h2 className="text-xs font-semibold uppercase tracking-widest pt-2" style={{ color: "var(--text-muted)" }}>
                Engagement Insights
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: "Telegram Linked",
                    value: growth.engagement.telegram_linked,
                    sub: "users with DM channel",
                    icon: MessageCircle,
                    color: "#229ed9",
                  },
                  {
                    label: "Users w/ Alerts",
                    value: growth.engagement.users_with_active_alerts,
                    sub: "have ≥1 active alert",
                    icon: Bell,
                    color: "var(--amber)",
                  },
                  {
                    label: "Hit Rate",
                    value: `${growth.engagement.hit_rate_pct}%`,
                    sub: `${growth.engagement.alerts_hitting_target} of ${growth.engagement.alerts_with_price} priced alerts`,
                    icon: Target,
                    color: "var(--green)",
                  },
                  {
                    label: "Total Notifs Sent",
                    value: growth.total_notifications_sent,
                    sub: `${growth.engagement.ever_triggered_count} alerts ever fired`,
                    icon: Zap,
                    color: "var(--lav)",
                  },
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

              {/* Top Alerted Products */}
              {growth.top_alerted_products.length > 0 && (
                <>
                  <h2 className="text-xs font-semibold uppercase tracking-widest pt-2" style={{ color: "var(--text-muted)" }}>
                    Most Watched Products
                  </h2>
                  <div className="dk-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy size={13} style={{ color: "var(--amber)" }} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Top Alerted Products (active alerts)</span>
                    </div>
                    <div className="space-y-2">
                      {growth.top_alerted_products.map((p, i) => {
                        const max = growth.top_alerted_products[0].alert_count;
                        const pct = Math.round((p.alert_count / max) * 100);
                        const color = PLATFORM_COLOR[p.platform] ?? "var(--text-muted)";
                        return (
                          <div key={p.id} className="flex items-center gap-3">
                            <span className="text-[10px] w-4 text-right flex-shrink-0" style={{ color: "var(--text-ghost)" }}>
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[8px] font-semibold uppercase" style={{ color }}>{p.platform}</span>
                                <span className="text-[10px] truncate text-white">{p.title}</span>
                              </div>
                              <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                              </div>
                            </div>
                            <span className="text-[10px] font-bold flex-shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-muted)" }}>
                              {p.alert_count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
