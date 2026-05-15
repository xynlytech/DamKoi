"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useInView, animate } from "framer-motion";
import { Search, Clock, Info, ArrowRight, TrendingDown, ShieldAlert, Bell } from "lucide-react";
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
  { icon: TrendingDown, color: "var(--lav)", bg: "rgba(124,58,237,0.12)", title: "Price History",       desc: "90 days of price data across every platform we track." },
  { icon: ShieldAlert,  color: "#f59e0b", bg: "rgba(245,158,11,0.12)", title: "Fake Deal Detector",   desc: "Instant verdict: is this discount real or inflated noise?" },
  { icon: Bell,         color: "#22c55e", bg: "rgba(34,197,94,0.12)",  title: "Price Alerts",         desc: "Email the moment it hits your target price. No account needed." },
];

const STATS = [
  { value: 120000, label: "Products Tracked",  suffix: "+" },
  { value: 8400,   label: "Price Drops Caught", suffix: "+" },
  { value: 23,     label: "Avg Savings",         suffix: "%" },
];

function CountUpInView({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const count = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    const c = animate(count, to, { duration: 1.4, ease: "easeOut" });
    return c.stop;
  }, [inView, count, to]);

  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    const unsub = count.on("change", (v) => { el.textContent = Math.floor(v).toLocaleString() + suffix; });
    return unsub;
  }, [inView, count, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

function MagneticBtn({ children, className, style, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 400, damping: 30 });
  const sy = useSpring(y, { stiffness: 400, damping: 30 });

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r  = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width  / 2)) * 0.25);
    y.set((e.clientY - (r.top  + r.height / 2)) * 0.25);
  };

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy, ...style }}
      onMouseMove={onMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className={className}
      {...(rest as object)}
    >
      {children}
    </motion.button>
  );
}

const item = {
  hidden:  { y: 24, opacity: 0 },
  visible: { y: 0,  opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function HeroSection() {
  const router = useRouter();
  const [url, setUrl]       = useState("");
  const [state, setState]   = useState<State>("idle");
  const [errorMsg, setMsg]  = useState("");

  const platform = detectPlatform(url);
  const isValid  = platform !== null;

  /* cursor glow */
  const glowX = useMotionValue(-400);
  const glowY = useMotionValue(-400);
  const sgx = useSpring(glowX, { stiffness: 200, damping: 30 });
  const sgy = useSpring(glowY, { stiffness: 200, damping: 30 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || !isValid) return;
    setState("loading");
    setMsg("");
    try {
      const res = await fetch(`${API}/products/lookup?url=${encodeURIComponent(trimmed)}`);
      if (res.ok)              { const d = await res.json(); router.push(`/product/${d.product.id}`); return; }
      if (res.status === 404)  { setState("tracking_started"); return; }
      if (res.status === 503)  { const e = await res.json().catch(() => ({})); setMsg(e.detail || "This platform is coming soon!"); setState("error"); return; }
      const e = await res.json().catch(() => ({}));
      throw new Error(e.detail || `API error ${res.status}`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
      setState("error");
    }
  };

  return (
    <section
      className="relative overflow-hidden"
      onMouseMove={(e) => { glowX.set(e.clientX); glowY.set(e.clientY); }}
    >
      {/* Cursor glow */}
      <motion.div
        className="dk-cursor-glow"
        style={{ left: sgx, top: sgy }}
      />

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%)",
        zIndex: 0,
      }} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto py-20 sm:py-28 px-4">

        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7 text-xs font-semibold uppercase tracking-widest"
          style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "var(--lav)" }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
          BD Shopping Intelligence · Live
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-none text-white"
        >
          Stop paying for{" "}
          <span style={{ position: "relative", display: "inline-block" }}>
            <span style={{ color: "var(--text-faint)" }}>fake</span>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.9, duration: 0.35, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: "-4%",
                top: "52%",
                width: "108%",
                height: "3px",
                background: "var(--red)",
                transformOrigin: "left center",
                transform: "translateY(-50%) rotate(-3deg)",
                borderRadius: "2px",
              }}
            />
          </span>{" "}
          <span style={{ color: "var(--lav)" }}>discounts.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-lg mb-10 max-w-2xl leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          Sellers inflate prices before sales. DamKoi shows you the real price history
          across Daraz, Cartup, Rokomari, and Pickaboo — and alerts you when prices genuinely drop.
        </motion.p>

        {/* URL Input */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-xl"
        >
          <form
            onSubmit={handleSubmit}
            className="flex items-center rounded-xl overflow-hidden"
            style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}
          >
            <div className="pl-4 flex-shrink-0" style={{ color: "var(--text-faint)" }}>
              <Search size={18} />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); if (state !== "idle") setState("idle"); }}
              placeholder="Paste any product URL — Daraz, Rokomari, Cartup…"
              className="flex-1 bg-transparent py-4 px-3 text-sm focus:outline-none min-w-0"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Product URL"
            />
            {platform && (
              <span
                className="hidden sm:flex items-center px-3 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--lav)", borderLeft: "1px solid var(--border-sm)", padding: "1rem 0.75rem" }}
              >
                {platform}
              </span>
            )}
            <MagneticBtn
              type="submit"
              disabled={state === "loading" || !isValid}
              className="dk-btn-primary text-xs uppercase tracking-widest flex-shrink-0"
              style={{ borderRadius: 0, padding: "1rem 1.25rem" }}
            >
              {state === "loading" ? "Checking…" : "Analyze"}
            </MagneticBtn>
          </form>
        </motion.div>

        {url.length > 10 && !isValid && (
          <p className="mt-3 text-sm flex items-center gap-1.5" style={{ color: "var(--red)" }} role="alert">
            <Info size={14} /> Paste a URL from Daraz, Cartup, Rokomari, or Pickaboo
          </p>
        )}

        {state === "tracking_started" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 px-5 py-4 rounded-xl text-left max-w-xl w-full flex items-start gap-3"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderLeft: "3px solid var(--amber)" }}
            role="status"
          >
            <Clock size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--amber)" }} />
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: "var(--amber)" }}>Tracking Started!</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Added to queue. Our scraper collects the first price within the next hour.
              </p>
            </div>
          </motion.div>
        )}

        {state === "error" && (
          <p className="mt-3 text-sm flex items-center gap-1.5" style={{ color: "var(--red)" }} role="alert">
            <Info size={14} /> {errorMsg}
          </p>
        )}

        {/* Quick links */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
        >
          <Link href="/deals" className="text-sm flex items-center gap-1.5 hover:text-white/60 transition-colors dk-focus" style={{ color: "var(--text-faint)" }}>
            Browse top deals <ArrowRight size={13} />
          </Link>
          <Link href="/dashboard" className="text-sm flex items-center gap-1.5 hover:text-white/60 transition-colors dk-focus" style={{ color: "var(--text-faint)" }}>
            My tracked products <ArrowRight size={13} />
          </Link>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
          className="mt-16 grid grid-cols-3 gap-4 w-full"
        >
          {STATS.map((s) => (
            <motion.div key={s.label} variants={item} className="dk-stat-card text-center">
              <div className="dk-stat-value mb-1"><CountUpInView to={s.value} suffix={s.suffix} /></div>
              <div className="dk-stat-label">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature cards */}
        <motion.div
          variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left"
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={item} className="dk-card p-5 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: f.bg, color: f.color }}>
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-base text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
