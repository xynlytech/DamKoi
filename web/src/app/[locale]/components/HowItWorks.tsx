import { ClipboardPaste, LineChart, ShieldCheck, Bell } from "lucide-react";

const STEPS = [
  { title: "Paste a product link",    desc: "Copy any product link from Daraz, Cartup, Rokomari or Pickaboo and paste it into DamKoi.", icon: ClipboardPaste },
  { title: "We check its real price", desc: "DamKoi compares today's price with the 30-day average and the lowest price it has recorded.", icon: LineChart },
  { title: "Get an honest verdict",   desc: "Best price, good deal, fair price, or fake discount, in plain words with the numbers behind it.", icon: ShieldCheck },
  { title: "Set a price alert",       desc: "Enter your email and a target price. We'll tell you when it drops. No account needed.", icon: Bell },
];

// Static server component: steps are visible without JavaScript and without
// waiting for a scroll animation (the old reveal left this section blank).
export default function HowItWorks() {
  return (
    <section className="py-14 sm:py-20" aria-labelledby="how-heading">
      <div className="max-w-2xl mb-10">
        <p className="dk-eyebrow mb-2">How it works</p>
        <h2 id="how-heading" className="dk-section-title">From suspicious discount to confident purchase</h2>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className="dk-card p-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold tabular-nums flex-shrink-0"
                  style={{ background: "var(--purple)", color: "#ffffff" }}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <Icon size={20} aria-hidden style={{ color: "var(--lav)" }} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{s.title}</h3>
              <p className="text-[0.9375rem]" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
