import type { Metadata } from "next";
import Link from "next/link";
import { Download, Globe, Star, Shield, Zap, Bell, BarChart3, Search, ArrowRight, CheckCircle, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Install DamKoi — Free Chrome Extension for BD Shoppers",
  description:
    "Add DamKoi to Chrome and get instant fake-discount detection on Daraz, Cartup, Rokomari, and Pickaboo. Free forever. No account needed.",
};

const FEATURES = [
  { icon: BarChart3, color: "text-blue-400 bg-blue-500/10 border-blue-500/20",   title: "90-Day Price History",    desc: "See when sellers inflate prices before a sale — the full chart right in the sidebar." },
  { icon: Shield,    color: "text-amber-400 bg-amber-500/10 border-amber-500/20", title: "Fake Discount Detector",  desc: "Deal score 1–10 computed in real time. Catch inflated 'sale' prices instantly." },
  { icon: Bell,      color: "text-purple-400 bg-purple-500/10 border-purple-500/20", title: "Price Drop Alerts",   desc: "Set a target price and get an email the moment it drops. No signup needed." },
  { icon: Search,    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", title: "Cross-Platform Compare", desc: "Same product, different platforms — see who's cheapest without tab-hopping." },
  { icon: Zap,       color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", title: "Zero Friction",     desc: "Works automatically on every product page. No clicking, no setup." },
];

const PLATFORMS = [
  { name: "Daraz",    color: "text-orange-400 border-orange-500/30 bg-orange-500/5" },
  { name: "Cartup",   color: "text-blue-400   border-blue-500/30   bg-blue-500/5"   },
  { name: "Rokomari", color: "text-green-400  border-green-500/30  bg-green-500/5"  },
  { name: "Pickaboo", color: "text-purple-400 border-purple-500/30 bg-purple-500/5" },
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
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm font-semibold mb-8">
          <Globe size={16} /> Chrome Extension &bull; Free Forever
        </div>

        <h1 className="text-5xl md:text-6xl font-black font-outfit tracking-tight mb-6 leading-[1.05]">
          Never overpay in{" "}
          <span className="text-gradient-indigo">Bangladesh</span>{" "}
          again
        </h1>

        <p className="text-lg text-white/50 mb-10 max-w-xl mx-auto leading-relaxed">
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
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all hover:scale-105 shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)]"
          >
            <Download size={20} />
            Add to Chrome &mdash; It&apos;s Free
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
          <Link
            href="/"
            id="cta-try-web"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-bold text-sm transition-all"
          >
            Try the web version
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-sm text-white/30">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
            ))}
            <span className="ml-2">5.0 on Chrome Web Store</span>
          </div>
          <span className="hidden sm:inline opacity-30">•</span>
          <span>No account required</span>
          <span className="hidden sm:inline opacity-30">•</span>
          <span>Works on Chrome, Edge &amp; Brave</span>
        </div>
      </section>

      {/* Platforms strip */}
      <section className="py-10 border-t border-white/5">
        <p className="text-center text-[10px] font-black uppercase tracking-widest text-white/20 mb-6">
          Works automatically on
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {PLATFORMS.map((p) => (
            <span key={p.name} className={`px-5 py-2 rounded-full border text-sm font-bold ${p.color}`}>
              {p.name}
            </span>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 border-t border-white/5">
        <h2 className="text-2xl font-black font-outfit text-center mb-10">
          Everything in one sidebar
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="nm-raised nm-interactive rounded-2xl p-5 flex flex-col gap-3">
              <div className={`w-10 h-10 nm-raised rounded-xl flex items-center justify-center ${f.color}`}>
                <f.icon size={20} />
              </div>
              <h3 className="font-black text-sm font-outfit">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to install + Preview */}
      <section className="py-16 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-black font-outfit mb-2">Ready in 30 seconds</h2>
            <p className="text-white/40 text-sm mb-8">No signup, no credit card, no tracking.</p>
            <div className="space-y-4">
              {HOW_TO_INSTALL.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/70 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mock sidebar widget */}
          <div className="nm-raised rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="nm-raised w-7 h-7 rounded-lg flex items-center justify-center text-indigo-400">
                <Activity size={14} />
              </div>
              <span className="font-black font-outfit text-indigo-400">DamKoi</span>
              <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-white/20 nm-pill rounded-full px-2 py-0.5">
                v2.0
              </span>
            </div>
            <div className="space-y-3">
              <div className="nm-inset rounded-xl px-4 py-3 border border-emerald-500/20">
                <p className="text-emerald-400 font-black text-sm flex items-center gap-1.5"><CheckCircle size={14} /> BEST PRICE</p>
                <p className="text-white/50 text-xs mt-1">Lowest in 90 days — buy with confidence</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: "Current", val: "৳4,500" },
                  { label: "30d Avg", val: "৳6,200" },
                  { label: "All-time Low", val: "৳4,200" },
                  { label: "Deal Score", val: "9 / 10" },
                ].map((item) => (
                  <div key={item.label} className="nm-inset rounded-xl p-3">
                    <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="font-black text-white">{item.val}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <div className="flex-1 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2 text-center">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Platform</p>
                  <p className="text-indigo-400 font-black text-xs mt-0.5">Daraz</p>
                </div>
                <div className="flex-1 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2 text-center">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">Confidence</p>
                  <p className="text-purple-400 font-black text-xs mt-0.5">High</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 text-center border-t border-white/5">
        <h2 className="text-3xl font-black font-outfit mb-4">Stop guessing. Start knowing.</h2>
        <p className="text-white/40 mb-8 text-sm">Free forever &bull; Works on Chrome, Edge, and Brave</p>
        <a
          href="https://chrome.google.com/webstore"
          target="_blank"
          rel="noopener noreferrer"
          id="cta-install-bottom"
          className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all hover:scale-105 shadow-[0_0_30px_rgba(99,102,241,0.35)]"
        >
          <Download size={18} /> Add to Chrome &mdash; Free
        </a>
        <p className="mt-6 text-sm text-white/20">
          Have a question?{" "}
          <Link href="/privacy" className="text-indigo-400/60 hover:text-indigo-400 transition-colors">
            Privacy Policy
          </Link>
        </p>
      </section>
    </div>
  );
}
