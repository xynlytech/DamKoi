"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, X, Shield, Zap, Target, Search } from "lucide-react";

const COMPARISON_DATA: Record<string, any> = {
  "damkoi-vs-buyhatke": {
    competitor: "Buyhatke",
    title: "DamKoi vs Buyhatke: The Best for Daraz Bangladesh?",
    description: "While Buyhatke is great for Indian markets, DamKoi is built specifically for the unique Daraz Bangladesh ecosystem.",
    features: [
      { name: "Daraz BD Support", damkoi: true, competitor: false },
      { name: "Real-time Scrapers", damkoi: true, competitor: "Slow" },
      { name: "Telegram Alerts", damkoi: true, competitor: true },
      { name: "Fake Discount Detection", damkoi: true, competitor: false },
      { name: "Liquid Glass Dashboard", damkoi: true, competitor: false },
    ]
  }
};

export default function ComparisonPage() {
  const { slug } = useParams();
  const data = COMPARISON_DATA[slug as string] || {
    competitor: "the Competition",
    title: "DamKoi: The Unstoppable Shopping Edge",
    description: "Compare DamKoi with any shopping tool and see the difference in precision.",
    features: [
      { name: "Daraz Intelligence", damkoi: true, competitor: false },
      { name: "Liquid Glass UI", damkoi: true, competitor: false },
      { name: "Local Cache", damkoi: true, competitor: false },
    ]
  };

  return (
    <div className="min-h-screen pt-40 pb-20 px-6 max-w-5xl mx-auto">
      {/* Visual Ambience */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-indigo-500/[0.05] rounded-full blur-[120px]" />
      </div>

      <div className="text-center mb-24 animate-in fade-in slide-in-from-top duration-1000">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 mb-8">
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Intelligence Report</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 font-outfit text-gradient-indigo">
          {data.title}
        </h1>
        <p className="text-white/40 text-xl md:text-2xl leading-relaxed max-w-3xl mx-auto font-medium">
          {data.description}
        </p>
      </div>

      {/* Comparison Matrix */}
      <div className="glass-card rounded-[3rem] overflow-hidden border border-white/10 animate-in fade-in slide-in-from-bottom duration-1000">
        <div className="grid grid-cols-3 bg-white/5 border-b border-white/10">
          <div className="p-10 text-xs font-black uppercase tracking-[0.3em] text-white/20">Capabilities</div>
          <div className="p-10 text-center flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/40 mb-2">🐟</div>
            <span className="text-lg font-black font-outfit">DamKoi</span>
          </div>
          <div className="p-10 text-center flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 mb-2 text-white/20 italic">?</div>
            <span className="text-lg font-black font-outfit text-white/40">{data.competitor}</span>
          </div>
        </div>

        {data.features.map((f: any, i: number) => (
          <div key={i} className="grid grid-cols-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
            <div className="p-10 flex items-center gap-4">
              <Zap className="w-4 h-4 text-indigo-400/40" />
              <span className="text-sm font-bold text-white/60">{f.name}</span>
            </div>
            <div className="p-10 flex items-center justify-center">
              {f.damkoi === true ? (
                <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
              ) : (
                <span className="text-sm font-black text-indigo-400">{f.damkoi}</span>
              )}
            </div>
            <div className="p-10 flex items-center justify-center">
              {f.competitor === true ? (
                <Check className="w-4 h-4 text-white/20" />
              ) : f.competitor === false ? (
                <X className="w-4 h-4 text-rose-500/40" />
              ) : (
                <span className="text-xs font-bold text-white/20">{f.competitor}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="mt-24 text-center">
        <h2 className="text-3xl font-black font-outfit mb-10 tracking-tight">Ready for the Unstoppable Advantage?</h2>
        <div className="flex flex-wrap justify-center gap-6">
          <Link href="/install" className="px-10 py-5 bg-indigo-600 rounded-full text-sm font-black uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-[0_20px_50px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95">
            Install DamKoi Now
          </Link>
          <Link href="/dashboard" className="px-10 py-5 glass hover:bg-white/10 rounded-full text-sm font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95">
            Explore Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
