import { ClipboardPaste, Bot, Search, Bell } from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Paste a product URL",
    desc: "Copy any product URL from Daraz, Cartup, Rokomari, or Pickaboo and paste it into DamKoi.",
    icon: ClipboardPaste,
    accent: "text-indigo-400",
    accentBorder: "border-indigo-500/30",
    accentBg: "bg-indigo-500/10",
  },
  {
    step: "02",
    title: "We scrape the real price",
    desc: "DamKoi checks the price today, compares it against the 30-day history, and computes a deal score.",
    icon: Bot,
    accent: "text-blue-400",
    accentBorder: "border-blue-500/30",
    accentBg: "bg-blue-500/10",
  },
  {
    step: "03",
    title: "Get the honest verdict",
    desc: "Is it FAKE_DISCOUNT or BEST_PRICE? Our algorithm catches sellers who inflate prices before a sale.",
    icon: Search,
    accent: "text-amber-400",
    accentBorder: "border-amber-500/30",
    accentBg: "bg-amber-500/10",
  },
  {
    step: "04",
    title: "Set a price alert",
    desc: "Enter your email and target price — we notify you the instant it drops. No account needed.",
    icon: Bell,
    accent: "text-emerald-400",
    accentBorder: "border-emerald-500/30",
    accentBg: "bg-emerald-500/10",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 sm:py-20">
      {/* Section divider */}
      <div className="flex items-center gap-4 mb-12">
        <div className="flex-1 h-px nm-inset rounded-full" style={{ height: 1 }} />
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-black font-outfit mb-1">How DamKoi Works</h2>
          <p className="text-white/35 text-sm leading-relaxed">
            Four steps from suspicious discount to confident purchase.
          </p>
        </div>
        <div className="flex-1 h-px nm-inset rounded-full" style={{ height: 1 }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.step} className="nm-raised nm-interactive rounded-2xl p-6 flex flex-col gap-4">
              {/* Icon + step number */}
              <div className="flex items-start justify-between">
                <div className={`h-11 w-11 rounded-xl ${s.accentBg} nm-raised flex items-center justify-center ${s.accent}`}>
                  <Icon size={22} />
                </div>
                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 nm-inset rounded-full ${s.accent} border ${s.accentBorder}`}
                >
                  {s.step}
                </span>
              </div>

              <h3 className="font-black text-base font-outfit text-white/90 leading-snug">{s.title}</h3>
              <p className="text-white/38 text-sm leading-relaxed">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
