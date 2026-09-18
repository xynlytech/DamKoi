"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Clock, Info, ArrowRight, TrendingDown, ShieldCheck, Bell, Loader2 } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";
const SUPPORTED_DOMAINS = ["daraz.com.bd", "cartup.com.bd", "rokomari.com", "pickaboo.com", "chaldal.com", "othoba.com"];

type State = "idle" | "loading" | "tracking_started" | "error";

function detectPlatform(url: string): string | null {
  for (const domain of SUPPORTED_DOMAINS) {
    if (url.includes(domain)) return domain.split(".")[0];
  }
  return null;
}

const FEATURES = [
  { icon: TrendingDown, color: "var(--lav)",   bg: "rgba(124,58,237,0.12)", title: "Real price history", desc: "See what a product actually cost over the last 90 days, not what the seller claims." },
  { icon: ShieldCheck,  color: "var(--amber)", bg: "rgba(245,158,11,0.12)", title: "Fake discount check", desc: "A plain verdict on every product: best price, good deal, fair price, or fake discount." },
  { icon: Bell,         color: "var(--green)", bg: "rgba(34,197,94,0.12)",  title: "Price drop alerts",  desc: "Pick a target price and get an email when it's reached. No account needed." },
];

export type HeroStats = { products: number; drops: number; stores: number };

function compact(n: number): string {
  if (n < 1000) return n.toLocaleString("en");
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: n < 10000 ? 1 : 0 }).format(n);
}

export default function HeroSection({ stats }: { stats: HeroStats | null }) {
  const router = useRouter();
  const [url, setUrl]      = useState("");
  const [state, setState]  = useState<State>("idle");
  const [errorMsg, setMsg] = useState("");

  const platform = detectPlatform(url);
  const isValid  = platform !== null;

  const [touched, setTouched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const trimmed = url.trim();
    if (!trimmed || !isValid) return;
    setState("loading");
    setMsg("");
    try {
      const res = await fetch(`${API}/products/lookup?url=${encodeURIComponent(trimmed)}`);
      if (res.ok)              { const d = await res.json(); router.push(`/product/${d.product.id}`); return; }
      if (res.status === 404)  { setState("tracking_started"); return; }
      if (res.status === 503)  { const e = await res.json().catch(() => ({})); setMsg(e.detail || "This store isn't supported yet."); setState("error"); return; }
      const e = await res.json().catch(() => ({}));
      throw new Error(e.detail || `Something went wrong (${res.status}). Please try again.`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setState("error");
    }
  };

  const statItems = stats
    ? [
        { value: `${compact(stats.products)}+`, label: "products tracked" },
        { value: `${compact(stats.drops)}+`,    label: "real price drops found" },
        { value: String(stats.stores),          label: "Bangladeshi stores" },
      ]
    : null;

  return (
    <section className="relative">
      {/* Soft brand wash behind the headline */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[480px] pointer-events-none"
        style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(124,58,237,0.14) 0%, transparent 70%)" }}
      />

      <div className="relative flex flex-col items-center text-center max-w-3xl mx-auto pt-16 pb-12 sm:pt-24 sm:pb-16 px-1">

        {/* Eyebrow */}
        <span
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6 text-sm font-medium"
          style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)", color: "var(--text-secondary)", boxShadow: "var(--shadow-card)" }}
        >
          <span className="relative flex w-2 h-2" aria-hidden>
            <span className="absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping" style={{ background: "var(--green)" }} />
            <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: "var(--green)" }} />
          </span>
          Live price tracking for Bangladesh
        </span>

        {/* Headline: no fade-in, it's the LCP element */}
        <h1 className="text-[2.5rem] leading-[1.08] sm:text-6xl font-bold mb-5" style={{ color: "var(--text-primary)" }}>
          Stop paying for{" "}
          <span className="relative inline-block whitespace-nowrap">
            <span style={{ color: "var(--text-faint)" }}>fake</span>
            <motion.span
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.35, ease: "easeOut" }}
              className="absolute left-[-4%] top-[55%] w-[108%] h-[3px] rounded-full origin-left"
              style={{ background: "var(--red)", rotate: -3 }}
            />
          </span>{" "}
          <span style={{ color: "var(--lav)" }}>discounts.</span>
        </h1>

        <p className="text-lg sm:text-xl max-w-2xl mb-9" style={{ color: "var(--text-muted)", lineHeight: 1.55 }}>
          Sellers raise prices before a sale, then &ldquo;discount&rdquo; them.
          DamKoi checks every price against its real history, so you know if a deal is genuine.
        </p>

        {/* URL input */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl" role="search" aria-label="Check a product">
          <div
            className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl transition-shadow focus-within:shadow-[0_0_0_4px_rgba(124,58,237,0.18)]"
            style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)", boxShadow: "var(--shadow-card)" }}
          >
            <label className="flex items-center gap-3 flex-1 min-w-0 px-3">
              <Search size={20} aria-hidden style={{ color: "var(--text-faint)", flexShrink: 0 }} />
              <span className="sr-only">Product URL</span>
              <input
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setTouched(false); if (state !== "idle") setState("idle"); }}
                placeholder="Paste a product link"
                className="flex-1 min-w-0 bg-transparent py-3 text-base focus:outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              {platform && (
                <span className="hidden sm:inline-flex dk-badge dk-badge-purple capitalize">{platform}</span>
              )}
            </label>
            <button
              type="submit"
              disabled={state === "loading"}
              className="dk-btn-primary sm:w-auto w-full"
              style={{ minHeight: "3rem", paddingInline: "1.5rem" }}
            >
              {state === "loading" ? (<><Loader2 size={18} className="animate-spin" aria-hidden /> Checking…</>) : "Check price"}
            </button>
          </div>
        </form>

        <div className="min-h-[1.5rem] mt-3 w-full max-w-2xl" aria-live="polite">
          {!isValid && (url.length > 10 || touched) && (
            <p className="text-sm flex items-center justify-center gap-1.5" style={{ color: "var(--red)" }}>
              <Info size={15} aria-hidden />
              {url.trim() ? "That link isn't from a supported store yet." : "Paste a product link first."}
            </p>
          )}

          {state === "error" && (
            <p className="text-sm flex items-center justify-center gap-1.5" style={{ color: "var(--red)" }}>
              <Info size={15} aria-hidden /> {errorMsg}
            </p>
          )}

          {state === "tracking_started" && (
            <div
              className="px-4 py-3.5 rounded-xl text-left flex items-start gap-3"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <Clock size={18} className="mt-0.5 flex-shrink-0" style={{ color: "var(--amber)" }} aria-hidden />
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>We&apos;ve started tracking this product</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Its first price is collected within a day. Check back soon for the full verdict.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium">
          <Link href="/deals" className="inline-flex items-center gap-1.5 dk-focus" style={{ color: "var(--lav)" }}>
            Browse today&apos;s deals <ArrowRight size={15} aria-hidden />
          </Link>
          <Link href="/install" className="inline-flex items-center gap-1.5 dk-focus" style={{ color: "var(--text-muted)" }}>
            Check prices while you shop <ArrowRight size={15} aria-hidden />
          </Link>
        </div>

        {/* Stats */}
        {statItems && (
          <dl className="mt-12 grid grid-cols-3 w-full max-w-2xl rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-sm)", background: "var(--bg1)", boxShadow: "var(--shadow-card)" }}>
            {statItems.map((s, i) => (
              <div key={s.label} className="flex flex-col-reverse px-3 py-5 sm:py-6" style={i ? { borderLeft: "1px solid var(--border-sm)" } : undefined}>
                <dt className="dk-stat-label mt-1">{s.label}</dt>
                <dd className="dk-stat-value">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto pb-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="dk-card p-6 flex flex-col gap-3">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: f.bg, color: f.color }} aria-hidden>
                <Icon size={22} />
              </span>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{f.title}</h2>
              <p className="text-[0.9375rem]" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
