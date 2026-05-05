"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock, Info, ArrowRight, TrendingDown, ShieldAlert, Bell, BarChart3, Flame } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";
const SUPPORTED_DOMAINS = ["daraz.com.bd", "cartup.com.bd", "rokomari.com", "pickaboo.com", "chaldal.com", "othoba.com"];

type State = "idle" | "loading" | "tracking_started" | "error";

function detectPlatform(url: string): string | null {
  for (const domain of SUPPORTED_DOMAINS) {
    if (url.includes(domain)) return domain.split(".")[0];
  }
  return null;
}

export default function HeroSection() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const platform = detectPlatform(url);
  const isValid = platform !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || !isValid) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${API}/products/lookup?url=${encodeURIComponent(trimmed)}`);

      if (res.ok) {
        const data = await res.json();
        router.push(`/product/${data.product.id}`);
        return;
      }
      if (res.status === 404) {
        setState("tracking_started");
        return;
      }
      if (res.status === 503) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.detail || "This platform is coming soon!");
        setState("error");
        return;
      }

      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `API error ${res.status}`);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong");
      setState("error");
    }
  };

  return (
    <section className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto py-20">
      {/* Live badge */}
      <div className="inline-flex items-center px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 mb-6 text-sm font-semibold">
        <span className="flex h-2 w-2 rounded-full bg-indigo-400 mr-2 animate-pulse" />
        BD Shopping Intelligence • Live
      </div>

      <h1 className="text-5xl md:text-7xl font-black font-outfit tracking-tight mb-6 leading-[1.05]">
        Stop falling for{" "}
        <span className="text-gradient-indigo">fake discounts</span>
      </h1>

      <p className="text-lg md:text-xl text-white/50 mb-10 max-w-2xl leading-relaxed">
        Sellers inflate prices before sales. DamKoi shows you the real price
        history across Daraz, Cartup, Rokomari, and Pickaboo — and alerts you
        when prices genuinely drop.
      </p>

      {/* URL Input */}
      <div className="w-full max-w-xl relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/50 to-emerald-500/30 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-700" />
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center bg-[#1E293B] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className="pl-4 text-white/30">
            <Search size={20} />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (state !== "idle") setState("idle");
            }}
            placeholder="Paste any product URL — Daraz, Rokomari, Cartup, Chaldal…"
            className="flex-1 bg-transparent border-none py-4 px-3 text-sm focus:outline-none text-white placeholder:text-white/20"
          />
          {/* Platform chip */}
          {platform && (
            <span className="hidden sm:flex items-center px-3 text-[10px] font-black uppercase tracking-widest text-indigo-400 border-l border-white/10 h-full">
              {platform}
            </span>
          )}
          <button
            type="submit"
            disabled={state === "loading" || !isValid}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest py-4 px-6 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95"
          >
            {state === "loading" ? "Checking…" : "Analyze"}
          </button>
        </form>
      </div>

      {/* Validation hint */}
      {url.length > 10 && !isValid && (
        <p className="text-red-400 mt-3 text-sm flex items-center gap-1">
          <Info size={14} /> Paste a URL from Daraz, Cartup, Rokomari, or Pickaboo
        </p>
      )}

      {/* Tracking started */}
      {state === "tracking_started" && (
        <div className="mt-4 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 text-left max-w-xl w-full">
          <Clock size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-300 font-bold text-sm mb-1">Tracking Started!</p>
            <p className="text-amber-200/60 text-sm leading-relaxed">
              We&apos;ve added this product to our queue. Our scraper will collect
              the first price within the next hour. Come back then to see the full analysis.
            </p>
          </div>
        </div>
      )}

      {state === "error" && (
        <p className="text-red-400 mt-3 text-sm flex items-center gap-1">
          <Info size={14} /> {errorMsg}
        </p>
      )}

      <div className="mt-6 flex items-center gap-6">
        <Link href="/deals" className="text-sm text-white/30 hover:text-indigo-400 transition-colors flex items-center gap-1">
          <Flame size={14} className="text-indigo-500" /> Browse top deals <ArrowRight size={14} />
        </Link>
        <Link href="/dashboard" className="text-sm text-white/30 hover:text-indigo-400 transition-colors flex items-center gap-1">
          My tracked products <ArrowRight size={14} />
        </Link>
      </div>

      {/* 3 feature cards */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
        {[
          { icon: <TrendingDown size={22} />, color: "text-blue-400 bg-blue-500/10", title: "Price History", desc: "90 days of price data across every platform we track." },
          { icon: <ShieldAlert size={22} />, color: "text-amber-400 bg-amber-500/10", title: "Fake Deal Detector", desc: "Instant verdict: is this discount real or inflated noise?" },
          { icon: <Bell size={22} />, color: "text-purple-400 bg-purple-500/10", title: "Price Alerts", desc: "Email the moment it hits your target price. No account needed." },
        ].map((f, i) => (
          <div key={i} className="glass-card p-5 rounded-2xl flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-300">
            <div className={`h-10 w-10 rounded-xl ${f.color} flex items-center justify-center`}>{f.icon}</div>
            <h3 className="font-black text-base font-outfit">{f.title}</h3>
            <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
