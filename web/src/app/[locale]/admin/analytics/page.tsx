"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import {
  RefreshCw, BarChart2, TrendingUp, Database,
  Package, Camera, Layers,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

const PLATFORM_COLOR: Record<string, string> = {
  daraz:    "#f97316",
  cartup:   "#3b82f6",
  rokomari: "#ef4444",
  pickaboo: "#8b5cf6",
  chaldal:  "#22c55e",
  othoba:   "#ec4899",
};

type TrendPoint  = { date: string; count: number };
type Platform    = { platform: string; total: number; priced: number; stubs: number };
type Analytics = {
  products_trend:  TrendPoint[];
  snapshots_trend: TrendPoint[];
  platforms:       Platform[];
  catalog: {
    total: number; priced: number; stubs: number; quality_pct: number;
    added_today: number; added_7d: number; added_30d: number;
  };
  snapshots: { total: number; today: number; last_7d: number };
  storage: { used_bytes: number; used: string; limit_bytes: number; limit: string; usage_pct: number };
};

type Range = "7d" | "14d" | "30d";

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "14d": 14, "30d": 30 };

function fmt(n: number) { return n.toLocaleString("en-BD"); }

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-BD", { month: "short", day: "numeric" });
}

async function adminFetch(path: string) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
}

function sliceRange(data: TrendPoint[], days: number): TrendPoint[] {
  if (!data.length) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  return data.filter((d) => new Date(d.date) >= cutoff);
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--bg2)",
  border: "1px solid var(--border-sm)",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 11,
  fontFamily: "'IBM Plex Mono', monospace",
};

function StatCard({
  icon: Icon, label, value, sub, color = "var(--lav)",
}: { icon: React.ElementType; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} style={{ color }} />
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-faint)" }}>{label}</span>
      </div>
      <p className="text-2xl font-bold text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{value}</p>
      {sub && <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-white">{title}</h2>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData]       = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange]     = useState<Range>("30d");
  const [lastAt, setLastAt]   = useState<Date | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await adminFetch("/admin/analytics");
      if (res.ok) { setData(await res.json()); setLastAt(new Date()); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 60_000);
    return () => clearInterval(id);
  }, [load]);

  const days = RANGE_DAYS[range];
  const prodTrend = data ? sliceRange(data.products_trend, days) : [];
  const snapTrend = data ? sliceRange(data.snapshots_trend, days) : [];

  const storageColor = !data ? "var(--lav)"
    : data.storage.usage_pct > 80 ? "var(--red)"
    : data.storage.usage_pct > 50 ? "var(--amber)"
    : "var(--green)";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart2 size={22} style={{ color: "var(--lav)" }} />
            Analytics
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
            {lastAt ? `Refreshed ${lastAt.toLocaleTimeString("en-BD")}` : "Loading…"}
            {" · "}Auto-refreshes every 60s
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["7d", "14d", "30d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all dk-focus"
              style={range === r
                ? { background: "var(--lav)", color: "#fff" }
                : { background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }
              }
            >{r}</button>
          ))}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 dk-focus"
            style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32" style={{ color: "var(--text-faint)" }}>
          <RefreshCw size={28} className="animate-spin mr-3" />
          <span className="text-sm font-semibold uppercase tracking-widest">Loading analytics…</span>
        </div>
      ) : !data ? (
        <div className="text-center py-32" style={{ color: "var(--red)" }}>Failed to load data.</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard icon={Package}   label="Total Products"    value={fmt(data.catalog.total)}          sub={`${fmt(data.catalog.priced)} priced`}         color="var(--lav)" />
            <StatCard icon={TrendingUp} label="Added (30d)"      value={fmt(data.catalog.added_30d)}      sub={`+${fmt(data.catalog.added_today)} today`}    color="var(--green)" />
            <StatCard icon={Camera}    label="Total Snapshots"   value={fmt(data.snapshots.total)}         sub={`${fmt(data.snapshots.today)} today`}         color="var(--amber)" />
            <StatCard icon={Layers}    label="Catalog Quality"   value={`${data.catalog.quality_pct}%`}   sub={`${fmt(data.catalog.stubs)} stubs pending`}   color={data.catalog.quality_pct > 60 ? "var(--green)" : "var(--amber)"} />
          </div>

          {/* Catalog growth chart */}
          <div className="rounded-2xl p-6" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
            <SectionHeader
              title="Catalog Growth"
              sub={`New products added per day — ${range}`}
            />
            {prodTrend.length === 0 ? (
              <p className="text-center py-12 text-xs" style={{ color: "var(--text-faint)" }}>No data yet for this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={prodTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--lav)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--lav)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDate}
                    tick={{ fill: "var(--text-faint)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
                    axisLine={false} tickLine={false}
                    interval={Math.floor(prodTrend.length / 6)}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-faint)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelFormatter={fmtDate}
                    formatter={(v: number) => [fmt(v), "New products"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--lav)"
                    strokeWidth={2}
                    fill="url(#prodGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "var(--lav)", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Snapshot volume chart */}
          <div className="rounded-2xl p-6" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
            <SectionHeader
              title="Price Snapshot Volume"
              sub={`Daily scraping activity — ${range}`}
            />
            {snapTrend.length === 0 ? (
              <p className="text-center py-12 text-xs" style={{ color: "var(--text-faint)" }}>No data yet for this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={snapTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={snapTrend.length > 20 ? 8 : 14}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDate}
                    tick={{ fill: "var(--text-faint)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
                    axisLine={false} tickLine={false}
                    interval={Math.floor(snapTrend.length / 6)}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-faint)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelFormatter={fmtDate}
                    formatter={(v: number) => [fmt(v), "Snapshots"]}
                  />
                  <Bar dataKey="count" fill="var(--amber)" radius={[3, 3, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Platform breakdown + Storage side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform breakdown */}
            <div className="rounded-2xl p-6" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
              <SectionHeader title="Platform Breakdown" sub="Products per platform (total / priced / stubs)" />
              <div className="space-y-3">
                {data.platforms.map((p) => {
                  const pct = p.total > 0 ? Math.round((p.priced / p.total) * 100) : 0;
                  const col = PLATFORM_COLOR[p.platform] ?? "var(--lav)";
                  return (
                    <div key={p.platform}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                          <span className="text-xs font-semibold capitalize text-white">{p.platform}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px]" style={{ color: "var(--text-faint)", fontFamily: "'IBM Plex Mono', monospace" }}>
                            {fmt(p.priced)} / {fmt(p.total)}
                          </span>
                          <span className="text-[10px] font-semibold" style={{ color: col, fontFamily: "'IBM Plex Mono', monospace" }}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-ghost, rgba(255,255,255,0.06))" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: col }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Storage gauge */}
            <div className="rounded-2xl p-6" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
              <SectionHeader title="Storage Usage" sub="Supabase free tier: 500 MB" />

              <div className="flex items-end gap-3 mb-6">
                <p className="text-4xl font-bold text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {data.storage.usage_pct}%
                </p>
                <p className="text-sm mb-1" style={{ color: "var(--text-faint)" }}>
                  {data.storage.used} / {data.storage.limit}
                </p>
              </div>

              <div className="h-3 rounded-full overflow-hidden mb-3" style={{ background: "var(--surface-ghost, rgba(255,255,255,0.06))" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(data.storage.usage_pct, 100)}%`, background: storageColor }}
                />
              </div>

              <div className="mt-6 space-y-2">
                <StorageRow label="Used" value={data.storage.used} color={storageColor} />
                <StorageRow label="Remaining" value={_fmtBytesClient(data.storage.limit_bytes - data.storage.used_bytes)} color="var(--text-faint)" />
              </div>

              <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border-sm)" }}>
                <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                  <Database size={9} className="inline mr-1" />
                  Supabase free tier limit is 500 MB total. Upgrade before reaching 80%.
                </p>
              </div>
            </div>
          </div>

          {/* Snapshot KPI row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl p-5" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--text-faint)" }}>Snapshots — Today</p>
              <p className="text-2xl font-bold text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(data.snapshots.today)}</p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--text-faint)" }}>Snapshots — Last 7d</p>
              <p className="text-2xl font-bold text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(data.snapshots.last_7d)}</p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--text-faint)" }}>Snapshots — Total</p>
              <p className="text-2xl font-bold text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(data.snapshots.total)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StorageRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color, fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
    </div>
  );
}

function _fmtBytesClient(b: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(1)} ${units[i]}`;
}
