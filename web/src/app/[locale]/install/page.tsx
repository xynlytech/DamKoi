import type { Metadata } from "next";
import Link from "next/link";
import { Download, Globe, Star, Shield, Zap, Bell, BarChart3, Search, ArrowRight, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Install DamKoi — Free Chrome Extension for BD Shoppers",
  description:
    "Add DamKoi to Chrome and get instant fake-discount detection on Daraz, Cartup, Rokomari, and Pickaboo. Free forever. No account needed.",
};

const FEATURES = [
  { icon: BarChart3, color: "#3b82f6",  bg: "rgba(59,130,246,0.12)",  title: "90-Day Price History",    desc: "See when sellers inflate prices before a sale — the full chart right in the sidebar." },
  { icon: Shield,    color: "#f59e0b",  bg: "rgba(245,158,11,0.12)",  title: "Fake Discount Detector",  desc: "Deal score 1–10 computed in real time. Catch inflated 'sale' prices instantly." },
  { icon: Bell,      color: "var(--lav)",  bg: "rgba(124,58,237,0.12)",  title: "Price Drop Alerts",       desc: "Set a target price and get an email the moment it drops. No signup needed." },
  { icon: Search,    color: "#22c55e",  bg: "rgba(34,197,94,0.12)",   title: "Cross-Platform Compare",  desc: "Same product, different platforms — see who's cheapest without tab-hopping." },
  { icon: Zap,       color: "var(--lav2)",  bg: "rgba(124,58,237,0.12)",  title: "Zero Friction",           desc: "Works automatically on every product page. No clicking, no setup." },
];

const PLATFORMS = [
  { name: "Daraz",    color: "#f97316", bg: "rgba(249,115,22,0.06)",  border: "rgba(249,115,22,0.2)"  },
  { name: "Cartup",   color: "#3b82f6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.2)"  },
  { name: "Rokomari", color: "#ef4444", bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.2)"   },
  { name: "Pickaboo", color: "#8b5cf6", bg: "rgba(139,92,246,0.06)",  border: "rgba(139,92,246,0.2)"  },
];

const HOW_TO_INSTALL = [
  'Click "Add to Chrome" below',
  'Click "Add Extension" in the Chrome popup',
  "Visit any product page on Daraz, Cartup, Rokomari, or Pickaboo",
  "DamKoi automatically shows price history and the deal verdict",
];

export default function InstallPage() {
  return (
    <div className="container mx-auto px-4 max-w-4xl">

      {/* Hero */}
      <section className="text-center py-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8" style={{ border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.1)", color: "var(--lav)" }}>
          <Globe size={16} /> Chrome Extension &bull; Free Forever
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.05] text-white">
          Never overpay in{" "}
          <span style={{ color: "var(--lav)" }}>Bangladesh</span>{" "}
          again
        </h1>

        <p className="text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
          DamKoi lives in your browser. Every time you open a product page, it
          instantly shows you whether the &ldquo;discount&rdquo; is real or just noise.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            id="cta-install-chrome"
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:scale-105 dk-focus"
            style={{ background: "#7c3aed", boxShadow: "0 0 30px rgba(124,58,237,0.4)", color: "#ffffff" }}
          >
            <Download size={20} />
            Add to Chrome &mdash; It&apos;s Free
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
          <Link
            href="/"
            id="cta-try-web"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-medium text-sm transition-all dk-focus"
            style={{ border: "1px solid var(--border-sm)", color: "var(--text-body)" }}
          >
            Try the web version
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-sm" style={{ color: "var(--text-faint)" }}>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={13} className="fill-current" style={{ color: "var(--amber)" }} />
            ))}
            <span className="ml-2">5.0 on Chrome Web Store</span>
          </div>
          <span className="hidden sm:inline" style={{ opacity: 0.3 }}>•</span>
          <span>No account required</span>
          <span className="hidden sm:inline" style={{ opacity: 0.3 }}>•</span>
          <span>Works on Chrome, Edge &amp; Brave</span>
        </div>
      </section>

      {/* Platforms strip */}
      <section className="py-10" style={{ borderTop: "1px solid var(--border-sm)" }}>
        <p className="text-center text-[10px] font-semibold uppercase tracking-widest mb-6" style={{ color: "var(--text-faint)" }}>
          Works automatically on
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {PLATFORMS.map((p) => (
            <span key={p.name} className="px-5 py-2 rounded-full text-sm font-semibold" style={{ color: p.color, background: p.bg, border: `1px solid ${p.border}` }}>
              {p.name}
            </span>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16" style={{ borderTop: "1px solid var(--border-sm)" }}>
        <h2 className="text-2xl font-bold text-center mb-10 text-white">
          Everything in one sidebar
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="dk-card p-5 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: f.bg, color: f.color }}>
                <f.icon size={20} />
              </div>
              <h3 className="font-semibold text-sm text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to install + Preview */}
      <section className="py-16" style={{ borderTop: "1px solid var(--border-sm)" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2 text-white">Ready in 30 seconds</h2>
            <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>No signup, no credit card, no tracking.</p>
            <div className="space-y-4">
              {HOW_TO_INSTALL.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: "var(--green)" }} />
                  <span className="text-sm leading-relaxed" style={{ color: "var(--text-body)" }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mock sidebar widget */}
          <div className="dk-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
                <img src="/dk-logo.svg" alt="DamKoi" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-sm" style={{ color: "var(--lav)" }}>DamKoi</span>
              <span className="ml-auto text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "var(--bg3)", color: "var(--text-faint)" }}>
                v2.0
              </span>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl px-4 py-3" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--green)" }}><CheckCircle size={14} /> BEST PRICE</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Lowest in 90 days — buy with confidence</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: "Current", val: "৳4,500" },
                  { label: "30d Avg", val: "৳6,200" },
                  { label: "All-time Low", val: "৳4,200" },
                  { label: "Deal Score", val: "9 / 10" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-3" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
                    <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--text-faint)" }}>{item.label}</p>
                    <p className="font-semibold text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{item.val}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Platform</p>
                  <p className="text-xs mt-0.5 font-semibold" style={{ color: "#f97316" }}>Daraz</p>
                </div>
                <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Confidence</p>
                  <p className="text-xs mt-0.5 font-semibold" style={{ color: "var(--lav)" }}>High</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 text-center" style={{ borderTop: "1px solid var(--border-sm)" }}>
        <h2 className="text-3xl font-bold mb-4 text-white">Stop guessing. Start knowing.</h2>
        <p className="mb-8 text-sm" style={{ color: "var(--text-muted)" }}>Free forever &bull; Works on Chrome, Edge, and Brave</p>
        <a
          href="https://chrome.google.com/webstore"
          target="_blank"
          rel="noopener noreferrer"
          id="cta-install-bottom"
          className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:scale-105 dk-focus"
          style={{ background: "#7c3aed", boxShadow: "0 0 30px rgba(124,58,237,0.35)", color: "#ffffff" }}
        >
          <Download size={18} /> Add to Chrome &mdash; Free
        </a>
        <p className="mt-6 text-sm" style={{ color: "var(--text-faint)" }}>
          Have a question?{" "}
          <Link href="/privacy" className="transition-colors dk-focus" style={{ color: "rgba(167,139,250,0.6)" }}>
            Privacy Policy
          </Link>
        </p>
      </section>
    </div>
  );
}
