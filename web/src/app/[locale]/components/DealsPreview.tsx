"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, TrendingDown, ShoppingCart } from "lucide-react";

type DealItem = {
  product: {
    id: string;
    title: string;
    platform: string;
    current_price: number | null;
    image_url: string | null;
    url: string;
  };
  deal_score: number;
  label: string;
  avg_30d: number | null;
};

const PLATFORM_COLOR: Record<string, string> = {
  daraz:    "#f97316",
  cartup:   "#3b82f6",
  rokomari: "#ef4444",
  pickaboo: "#8b5cf6",
  chaldal:  "#22c55e",
  othoba:   "#ec4899",
};

function scoreColor(score: number) {
  if (score >= 9) return "var(--green)";
  if (score >= 7) return "var(--lav)";
  return "var(--amber)";
}

function fmt(paisa: number | null): string {
  if (!paisa) return "—";
  return `৳${(paisa / 100).toLocaleString("en-BD")}`;
}

function savings(current: number | null, avg: number | null): string | null {
  if (!current || !avg || avg <= current) return null;
  return fmt(avg - current);
}

const item = {
  hidden:  { y: 20, opacity: 0 },
  visible: { y: 0,  opacity: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

export default function DealsPreview({ deals }: { deals: DealItem[] }) {
  if (!deals.length) return null;

  return (
    <section className="py-14 sm:py-16">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5 text-white">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>
              <TrendingDown size={16} />
            </span>
            Today&apos;s Real Deals
          </h2>
          <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            Verified genuine price drops — not inflated discounts
          </p>
        </div>
        <Link
          href="/deals"
          className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors flex-shrink-0 dk-focus"
          style={{ color: "#a78bfa", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {deals.map((deal) => {
          const save   = savings(deal.product.current_price, deal.avg_30d);
          const pColor = PLATFORM_COLOR[deal.product.platform] ?? "rgba(255,255,255,0.4)";
          return (
            <motion.div key={deal.product.id} variants={item}>
              <Link
                href={`/product/${deal.product.id}`}
                className="dk-card p-4 flex gap-4 group block"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
                  {deal.product.image_url ? (
                    <img src={deal.product.image_url} alt={deal.product.title} className="w-full h-full object-contain p-1.5" loading="lazy" />
                  ) : (
                    <ShoppingCart size={20} style={{ color: "rgba(255,255,255,0.2)" }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span
                    className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ color: pColor, background: `${pColor}18`, border: `1px solid ${pColor}30` }}
                  >
                    {deal.product.platform}
                  </span>
                  <p className="text-sm font-medium mt-1.5 line-clamp-2 leading-snug" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {deal.product.title}
                  </p>
                  <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                    <span className="font-semibold text-base text-white" style={{ fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
                      {fmt(deal.product.current_price)}
                    </span>
                    {save && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "var(--green)", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                        Save {save}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl w-11 h-11 self-center" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
                  <span className="text-lg font-semibold leading-none" style={{ color: scoreColor(deal.deal_score), fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
                    {deal.deal_score}
                  </span>
                  <span className="text-[8px] font-medium uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>/10</span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-8 text-center">
        <Link href="/deals" className="dk-btn-secondary inline-flex items-center gap-2 text-sm dk-focus">
          Browse all verified deals <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
