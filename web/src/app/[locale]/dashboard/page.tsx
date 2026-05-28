"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight, Bell, TrendingDown, TrendingUp,
  Minus, LayoutDashboard, RefreshCw, Loader2,
  ShoppingCart, Activity, BellOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

const PLATFORM_COLOR: Record<string, string> = {
  daraz: "#f97316", cartup: "#3b82f6", rokomari: "#ef4444",
  pickaboo: "#8b5cf6", chaldal: "#22c55e", othoba: "#ec4899",
};

type Product = { id: string; title: string; platform: string; current_price: number | null; image_url: string | null; last_scraped_at: string | null; in_stock: boolean | null; };
type Alert   = { id: string; product_id: string; product_title: string | null; current_price: number | null; target_price: number; is_active: boolean; last_triggered: string | null; };

function fmt(p: number | null) {
  if (!p) return "—";
  return `৳${(p / 100).toLocaleString("en-BD")}`;
}

function ProductCard({ p }: { p: Product }) {
  const color = PLATFORM_COLOR[p.platform] ?? "var(--text-muted)";
  return (
    <Link href={`/product/${p.id}`} className="dk-card p-4 flex gap-3 group block">
      <div className="w-13 h-13 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ width: 52, height: 52, background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
        {p.image_url
          ? <img src={p.image_url} alt="" className="w-full h-full object-contain p-1" />
          : <ShoppingCart size={20} style={{ color: "var(--text-faint)" }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color }}>{p.platform}</span>
        <p className="text-sm font-medium line-clamp-2 leading-snug mt-0.5" style={{ color: "var(--text-secondary)" }}>{p.title}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="font-medium text-sm text-white" style={{ fontFamily: "var(--font-ibm-plex-mono), monospace" }}>{fmt(p.current_price)}</span>
          {p.in_stock === false && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "var(--red)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>Out of stock</span>}
        </div>
      </div>
      <ArrowUpRight size={14} className="flex-shrink-0 mt-1 transition-colors" style={{ color: "var(--text-ghost)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--lav)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-ghost)")}
      />
    </Link>
  );
}

function AlertRow({ a }: { a: Alert }) {
  const hit = a.current_price !== null && a.current_price <= a.target_price;
  return (
    <Link href={`/product/${a.product_id}`} className="flex items-center gap-3 py-3 transition-colors group" style={{ borderBottom: "1px solid var(--border-sm)" }}>
      {!a.current_price ? <Minus size={14} style={{ color: "var(--text-faint)" }} />
        : hit ? <TrendingDown size={14} style={{ color: "var(--green)" }} />
        : <TrendingUp size={14} style={{ color: "var(--amber)" }} />}
      <div className="flex-1 min-w-0">
        <p className="text-sm line-clamp-1 leading-snug" style={{ color: "var(--text-body)" }}>{a.product_title ?? "Product"}</p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>
          Target: <span style={{ color: "var(--text-body)" }}>{fmt(a.target_price)}</span>
          {a.current_price && <> · Now: <span style={{ color: hit ? "var(--green)" : "var(--text-body)", fontWeight: hit ? 600 : 400 }}>{fmt(a.current_price)}</span></>}
        </p>
      </div>
      {hit && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: "var(--green)", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>HIT</span>}
      {!a.is_active && <span className="text-[9px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: "var(--text-faint)", background: "var(--surface-ghost)" }}>Paused</span>}
    </Link>
  );
}

const item = { hidden: { y: 16, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const loginHref = `/${locale}/login`;
  const [products, setProducts]   = useState<Product[]>([]);
  const [alerts,   setAlerts]     = useState<Alert[]>([]);
  const [email,    setEmail]      = useState<string | null>(null);
  const [authChecked, setAuth]    = useState(false);
  const [loadingProd, setLoadP]   = useState(true);
  const [loadingAlert, setLoadA]  = useState(false);
  const [lastRefresh, setLast]    = useState<Date>(new Date());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace(loginHref); return; }
      setEmail(data.session.user.email ?? null);
      setAuth(true);
    }).catch(() => { router.replace(loginHref); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) { router.replace(loginHref); return; }
      setEmail(s.user.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [router, loginHref]);

  const fetchProducts = useCallback(async () => {
    setLoadP(true);
    try {
      const r = await fetch(`${API}/products?limit=24`, { cache: "no-store" });
      if (r.ok) { const d = await r.json(); setProducts(Array.isArray(d) ? d : (d.products ?? [])); }
    }
    catch { /* network error — leave products empty */ }
    finally { setLoadP(false); }
  }, []);

  const fetchAlerts = useCallback(async (e: string) => {
    setLoadA(true);
    try { const r = await fetch(`${API}/alerts/by-email?email=${encodeURIComponent(e)}`); if (r.ok) setAlerts(await r.json()); }
    catch { /* network error — leave alerts empty */ }
    finally { setLoadA(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { if (email) fetchAlerts(email); }, [email, fetchAlerts]);

  const refresh = () => { setLast(new Date()); fetchProducts(); if (email) fetchAlerts(email); };

  const activeAlerts = alerts.filter((a) => a.is_active);
  const hitAlerts    = alerts.filter((a) => a.current_price !== null && a.current_price <= a.target_price);

  if (!authChecked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin" style={{ color: "var(--lav)" }} />
      </div>
    );
  }

  return (
    <div className="mx-auto px-5 max-w-6xl py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard size={26} style={{ color: "var(--lav)" }} />
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-faint)" }}>
            Prices updated every 6 hours · last refresh {lastRefresh.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all dk-focus"
          style={{ border: "1px solid var(--border-sm)", background: "var(--bg1)", color: "var(--text-muted)" }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats strip */}
      <motion.div
        variants={stagger} initial="hidden" animate="visible"
        className="grid grid-cols-3 gap-3 mb-8"
      >
        {[
          { label: "Tracked",      value: loadingProd  ? "…" : products.length.toString(),    sub: "products"     },
          { label: "Active Alerts",value: loadingAlert ? "…" : activeAlerts.length.toString(),sub: "of 3 free"    },
          { label: "Price Hits",   value: loadingAlert ? "…" : hitAlerts.length.toString(),   sub: "ready to buy" },
        ].map((s) => (
          <motion.div key={s.label} variants={item} className="dk-stat-card text-center">
            <div className="dk-stat-value mb-0.5">{s.value}</div>
            <div className="dk-stat-label">{s.label}</div>
            <div className="text-[9px] mt-0.5" style={{ color: "var(--text-faint)" }}>{s.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products — 2/3 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>All tracked products</h2>
            <Link href="/" className="text-xs transition-colors dk-focus" style={{ color: "var(--lav)" }}>+ Track another</Link>
          </div>

          {loadingProd ? (
            <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: "var(--lav)" }} /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
              <Activity size={44} strokeWidth={1.5} className="mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
              <h3 className="font-semibold text-white mb-2">Nothing tracked yet</h3>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Paste a product URL on the homepage to start.</p>
              <Link href="/" className="dk-btn-primary text-xs uppercase tracking-widest inline-flex dk-focus">Start Tracking</Link>
            </div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {products.map((p) => <motion.div key={p.id} variants={item}><ProductCard p={p} /></motion.div>)}
            </motion.div>
          )}
        </div>

        {/* Alerts panel — 1/3 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
              <Bell size={13} /> My Alerts
            </h2>
            <Link href="/alerts" className="text-xs transition-colors dk-focus" style={{ color: "var(--lav)" }}>Manage</Link>
          </div>

          <div className="rounded-2xl p-4" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
            {loadingAlert ? (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin" style={{ color: "var(--lav)" }} /></div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-6">
                <BellOff size={36} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: "var(--text-faint)" }} />
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>No alerts set yet.</p>
                <Link href="/" className="text-xs dk-focus" style={{ color: "var(--lav)" }}>Find a product →</Link>
              </div>
            ) : (
              <div>
                {alerts.slice(0, 5).map((a) => <AlertRow key={a.id} a={a} />)}
                {alerts.length > 5 && (
                  <Link href="/alerts" className="block text-center text-xs mt-3 transition-colors dk-focus" style={{ color: "var(--lav)" }}>
                    + {alerts.length - 5} more alerts →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
