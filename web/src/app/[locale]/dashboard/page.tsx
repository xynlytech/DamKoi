"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight, Bell, TrendingDown, TrendingUp,
  Minus, LayoutDashboard, RefreshCw, Loader2,
  ShoppingCart, Activity, BellOff, User
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

type Product = {
  id: string;
  title: string;
  platform: string;
  current_price: number | null;
  image_url: string | null;
  last_updated: string | null;
  in_stock: boolean | null;
};

type Alert = {
  id: string;
  product_id: string;
  product_title: string | null;
  current_price: number | null;
  target_price: number;
  is_active: boolean;
  last_triggered: string | null;
};

const PLATFORM_COLOR: Record<string, string> = {
  daraz:    "text-orange-400",
  cartup:   "text-blue-400",
  rokomari: "text-green-400",
  pickaboo: "text-purple-400",
  chaldal:  "text-teal-400",
  othoba:   "text-pink-400",
};

function fmt(p: number | null) {
  if (!p) return "—";
  return `৳${(p / 100).toLocaleString("en-BD")}`;
}

function PriceTrend({ current, target }: { current: number | null; target: number }) {
  if (!current) return <Minus size={14} className="text-white/20" />;
  if (current <= target) return <TrendingDown size={14} className="text-emerald-400" />;
  return <TrendingUp size={14} className="text-amber-400" />;
}

function ProductCard({ p }: { p: Product }) {
  return (
    <Link
      href={`/product/${p.id}`}
      className="nm-raised nm-interactive rounded-2xl p-5 flex gap-4 group"
    >
      <div className="w-14 h-14 rounded-xl nm-inset flex-shrink-0 overflow-hidden">
        {p.image_url
          ? <img src={p.image_url} alt="" className="w-full h-full object-contain p-1" />
          : <div className="w-full h-full flex items-center justify-center text-white/20"><ShoppingCart size={24} /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-[9px] font-black uppercase tracking-widest ${PLATFORM_COLOR[p.platform] ?? "text-white/30"}`}>
          {p.platform}
        </span>
        <p className="text-sm font-semibold text-white/80 mt-0.5 line-clamp-2 leading-snug">{p.title}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="font-black text-base font-mono">{fmt(p.current_price)}</span>
          {p.in_stock === false && (
            <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              Out of stock
            </span>
          )}
        </div>
        {p.last_updated && (
          <p className="text-[10px] text-white/20 mt-1">
            Updated {new Date(p.last_updated).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
          </p>
        )}
      </div>
      <ArrowUpRight size={14} className="text-white/10 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-1" />
    </Link>
  );
}

function AlertRow({ a }: { a: Alert }) {
  const hit = a.current_price !== null && a.current_price <= a.target_price;
  return (
    <Link
      href={`/product/${a.product_id}`}
      className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0 hover:bg-white/3 -mx-2 px-2 rounded-xl transition-colors group"
    >
      <PriceTrend current={a.current_price} target={a.target_price} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/70 line-clamp-1 leading-snug group-hover:text-white transition-colors">
          {a.product_title ?? "Product"}
        </p>
        <p className="text-[10px] text-white/30 mt-0.5">
          Target: <span className="text-white/60">{fmt(a.target_price)}</span>
          {a.current_price && (
            <> · Now: <span className={hit ? "text-emerald-400 font-bold" : "text-white/60"}>{fmt(a.current_price)}</span></>
          )}
        </p>
      </div>
      {hit && (
        <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
          HIT ✓
        </span>
      )}
      {!a.is_active && (
        <span className="text-[9px] font-bold text-white/20 bg-white/5 px-2 py-0.5 rounded-full shrink-0">
          Paused
        </span>
      )}
    </Link>
  );
}

function AlertsSignInPrompt() {
  return (
    <div className="py-6 text-center">
      <div className="flex justify-center mb-3 text-white/20">
        <User size={32} strokeWidth={1.5} />
      </div>
      <p className="text-xs text-white/40 mb-4 leading-relaxed">
        Sign in to see your price alerts.
      </p>
      <Link
        href="/login"
        className="inline-block py-2.5 px-5 nm-btn-primary rounded-xl text-[10px] uppercase tracking-widest font-black"
      >
        Sign In
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace("/login"); return; }
      setEmail(data.session.user.email ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { router.replace("/login"); return; }
      setEmail(session.user.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API}/products/?limit=24`, { cache: "no-store" });
      if (res.ok) setProducts(await res.json());
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchAlerts = useCallback(async (e: string) => {
    setLoadingAlerts(true);
    try {
      const res = await fetch(`${API}/alerts/by-email?email=${encodeURIComponent(e)}`);
      if (res.ok) setAlerts(await res.json());
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (email) fetchAlerts(email);
  }, [email, fetchAlerts]);

  const refresh = () => {
    setLastRefresh(new Date());
    fetchProducts();
    if (email) fetchAlerts(email);
  };

  const activeAlerts = alerts.filter((a) => a.is_active);
  const hitAlerts = alerts.filter((a) => a.current_price !== null && a.current_price <= a.target_price);

  if (!authChecked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black font-outfit flex items-center gap-3">
            <LayoutDashboard size={30} className="text-indigo-400" />
            Dashboard
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Prices updated every 6 hours · last refresh {lastRefresh.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-white/40 hover:text-white text-xs font-bold transition-all"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Tracked", value: loadingProducts ? "…" : products.length.toString(), sub: "products" },
          { label: "Active Alerts", value: loadingAlerts ? "…" : activeAlerts.length.toString(), sub: `of 3 free` },
          { label: "Price Hits", value: loadingAlerts ? "…" : hitAlerts.length.toString(), sub: "ready to buy" },
        ].map((s) => (
          <div key={s.label} className="nm-raised rounded-2xl p-4 text-center">
            <p className="text-2xl font-black font-mono">{s.value}</p>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-0.5">{s.label}</p>
            <p className="text-[9px] text-white/20 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product grid — 2/3 width */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black font-outfit text-sm uppercase tracking-widest text-white/40">
              All tracked products
            </h2>
            <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              + Track another
            </Link>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 nm-raised rounded-2xl">
              <div className="flex justify-center mb-4 text-white/20">
                <Activity size={48} strokeWidth={1.5} />
              </div>
              <h3 className="font-black font-outfit mb-2">Nothing tracked yet</h3>
              <p className="text-white/40 text-sm mb-6">
                Paste a product URL on the homepage to start.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all"
              >
                Start Tracking
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>

        {/* Alerts panel — 1/3 width */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black font-outfit text-sm uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Bell size={13} /> My Alerts
            </h2>
            <Link href="/alerts" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Manage
            </Link>
          </div>

          <div className="nm-raised rounded-2xl p-4">
            {loadingAlerts ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-indigo-400" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-6">
                <div className="flex justify-center mb-3 text-white/20">
                  <BellOff size={40} strokeWidth={1.5} />
                </div>
                <p className="text-sm text-white/40 mb-4">No alerts set yet.</p>
                <Link
                  href="/"
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline transition-colors"
                >
                  Find a product →
                </Link>
              </div>
            ) : (
              <div>
                {alerts.slice(0, 5).map((a) => (
                  <AlertRow key={a.id} a={a} />
                ))}
                {alerts.length > 5 && (
                  <Link
                    href="/alerts"
                    className="block text-center text-xs text-indigo-400 hover:text-indigo-300 mt-3 transition-colors"
                  >
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
