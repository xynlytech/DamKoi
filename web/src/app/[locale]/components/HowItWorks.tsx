"use client";

import { motion } from "framer-motion";
import { ClipboardPaste, Bot, Search, Bell } from "lucide-react";

const STEPS = [
  { step: "01", title: "Paste a product URL",       desc: "Copy any product URL from Daraz, Cartup, Rokomari, or Pickaboo and paste it into DamKoi.", icon: ClipboardPaste, color: "#a78bfa", bg: "rgba(124,58,237,0.12)" },
  { step: "02", title: "We scrape the real price",  desc: "DamKoi checks the price today, compares it against the 30-day history, and computes a deal score.", icon: Bot,  color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  { step: "03", title: "Get the honest verdict",    desc: "Is it FAKE_DISCOUNT or BEST_PRICE? Our algorithm catches sellers who inflate prices before a sale.", icon: Search, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { step: "04", title: "Set a price alert",         desc: "Enter your email and target price — we notify you the instant it drops. No account needed.", icon: Bell, color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
];

const item = {
  hidden:  { y: 24, opacity: 0 },
  visible: { y: 0,  opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function HowItWorks() {
  return (
    <section className="py-16 sm:py-20">
      <div className="dk-divider" />

      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">How DamKoi Works</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          Four steps from suspicious discount to confident purchase.
        </p>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto"
      >
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.step} variants={item} className="dk-card p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg, color: s.color }}>
                  <Icon size={20} />
                </div>
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}30` }}
                >
                  {s.step}
                </span>
              </div>
              <h3 className="font-semibold text-base text-white leading-snug">{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{s.desc}</p>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="dk-divider mt-16" />
    </section>
  );
}
