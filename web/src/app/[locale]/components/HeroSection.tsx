"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock, Info, ArrowRight, TrendingDown, ShieldAlert, Bell, Flame } from "lucide-react";
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

const FEATURES = [
  {
    icon: <TrendingDown size={22} />,
    accent: "text-blue-400",
    accentBg: "bg-blue-500/10",
    title: "Price History",
    desc: "90 days of price data across every platform we track.",
  },
  {
    icon: <ShieldAlert size={22} />,
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
    title: "Fake Deal Detector",
    desc: "Instant verdict: is this discount real or inflated noise?",
  },
  {
    icon: <Bell size={22} />,
    accent: "text-purple-400",
    accentBg: "bg-purple-500/10",
    title: "Price Alerts",
    desc: "Email the moment it hits your target price. No account needed.",
  },
];

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
    <section className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto py-16 sm:py-24 px-2">
      {/* Live badge */}
      <div className="nm-pill inline-flex items-center px-4 py-1.5 rounded-full text-indigo-400 mb-7 text-xs font-bold uppercase tracking-widest">
        <span className="flex h-2 w-2 rounded-full bg-indigo-400 mr-2.5 animate-pulse" />
        BD Shopping Intelligence · Live
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-7xl font-black font-outfit tracking-tight mb-6 leading-[1.05]">
        Stop falling for{" "}
        <span className="text-gradient-indigo">fake discounts</span>
      </h1>

      <p className="text-base sm:text-lg md:text-xl text-white/45 mb-10 max-w-2xl leading-relaxed px-2">
        Sellers inflate prices before sales. DamKoi shows you the real price
        history across Daraz, Cartup, Rokomari, and Pickaboo — and alerts you
        when prices genuinely drop.
      </p>

      {/* URL Input */}
      <div className="w-full max-w-xl">
        <form
          onSubmit={handleSubmit}
          className="nm-inset rounded-2xl overflow-hidden flex items-center"
        >
          <div className="pl-4 text-white/25 flex-shrink-0">
            <Search size={19} />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (state !== "idle") setState("idle");
            }}
            placeholder="Paste any product URL — Daraz, Rokomari, Cartup…"
            className="flex-1 bg-transparent border-none py-4 px-3 text-sm focus:outline-none text-white/90 placeholder:text-white/20 min-w-0"
            aria-label="Product URL"
          />
          {/* Platform chip */}
          {platform && (
            <span className="hidden sm:flex items-center px-3 text-[10px] font-black uppercase tracking-widest text-indigo-400 border-l border-white/8 h-full py-4">
              {platform}
            </span>
          )}
          <button
            type="submit"
            disabled={state === "loading" || !isValid}
            className="nm-btn-primary text-xs uppercase tracking-widest py-4 px-5 sm:px-6 rounded-none flex-shrink-0 nm-focus"
          >
            {state === "loading" ? "Checking…" : "Analyze"}
          </button>
        </form>
      </div>

      {/* Validation hint */}
      {url.length > 10 && !isValid && (
        <p className="text-red-400 mt-3 text-sm flex items-center gap-1.5" role="alert">
          <Info size={14} /> Paste a URL from Daraz, Cartup, Rokomari, or Pickaboo
        </p>
      )}

      {/* Tracking started */}
      {state === "tracking_started" && (
        <div className="mt-4 nm-raised rounded-2xl px-5 py-4 text-left max-w-xl w-full flex items-start gap-3 border-l-4 border-amber-500/50" role="status">
          <Clock size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-300 font-bold text-sm mb-1">Tracking Started!</p>
            <p className="text-white/45 text-sm leading-relaxed">
              Added to queue. Our scraper collects the first price within the next hour.
              Come back then to see the full analysis.
            </p>
          </div>
        </div>
      )}

      {state === "error" && (
        <p className="text-red-400 mt-3 text-sm flex items-center gap-1.5" role="alert">
          <Info size={14} /> {errorMsg}
        </p>
      )}

      {/* Quick links */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        <Link
          href="/deals"
          className="text-sm text-white/30 hover:text-indigo-400 transition-colors flex items-center gap-1.5 nm-focus"
        >
          <Flame size={13} className="text-indigo-500" /> Browse top deals <ArrowRight size={13} />
        </Link>
        <Link
          href="/dashboard"
          className="text-sm text-white/30 hover:text-indigo-400 transition-colors flex items-center gap-1.5 nm-focus"
        >
          My tracked products <ArrowRight size={13} />
        </Link>
      </div>

      {/* Feature cards */}
      <div className="mt-14 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="nm-raised nm-interactive rounded-2xl p-5 flex flex-col gap-3"
          >
            <div className={`h-10 w-10 rounded-xl ${f.accentBg} flex items-center justify-center ${f.accent} nm-raised`}>
              {f.icon}
            </div>
            <h3 className="font-black text-base font-outfit text-white/90">{f.title}</h3>
            <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
