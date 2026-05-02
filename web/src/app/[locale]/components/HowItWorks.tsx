const STEPS = [
  {
    step: "01",
    title: "Paste a product URL",
    desc: "Copy any product URL from Daraz, Cartup, Rokomari, or Pickaboo and paste it into DamKoi.",
    emoji: "📋",
    color: "text-indigo-400 border-indigo-500/20",
  },
  {
    step: "02",
    title: "We scrape the real price",
    desc: "DamKoi checks the price today, compares it against the 30-day history, and computes a deal score.",
    emoji: "🤖",
    color: "text-blue-400 border-blue-500/20",
  },
  {
    step: "03",
    title: "Get the honest verdict",
    desc: "Is it FAKE_DISCOUNT or BEST_PRICE? Our algorithm catches sellers who inflate prices before a sale.",
    emoji: "🔍",
    color: "text-amber-400 border-amber-500/20",
  },
  {
    step: "04",
    title: "Set a price alert",
    desc: "Enter your email and target price — we'll notify you the instant it drops. No account needed.",
    emoji: "🔔",
    color: "text-emerald-400 border-emerald-500/20",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 border-t border-white/5">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black font-outfit mb-3">How DamKoi Works</h2>
        <p className="text-white/40 max-w-xl mx-auto text-sm leading-relaxed">
          Four steps from suspicious discount to confident purchase decision.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {STEPS.map((s) => (
          <div key={s.step} className="glass-card rounded-2xl p-6 flex flex-col gap-4">
            <div className={`text-3xl font-black font-mono border-b pb-4 ${s.color}`}>
              {s.emoji}
            </div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${s.color}`}>
              Step {s.step}
            </div>
            <h3 className="font-black text-base font-outfit">{s.title}</h3>
            <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
