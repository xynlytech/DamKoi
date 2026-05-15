"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

type PricePoint = {
  price: number;
  original_price: number | null;
  discount_pct: number | null;
  in_stock: boolean;
  scraped_at: string;
};

function fmt(paisa: number): string {
  return `৳${(paisa / 100).toLocaleString("en-BD")}`;
}

function PriceSparkline({ points, days, setDays }: {
  points: PricePoint[];
  days: number;
  setDays: (d: number) => void;
}) {
  const sorted = [...points].sort(
    (a, b) => new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime()
  );

  if (sorted.length < 2) {
    return (
      <div className="text-center py-10 text-sm italic" style={{ color: "var(--text-faint)" }}>
        Not enough data yet ({sorted.length} point{sorted.length !== 1 ? "s" : ""} tracked)
      </div>
    );
  }

  const W = 800, H = 250, PAD = { t: 20, r: 20, b: 40, l: 70 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const prices = sorted.map((p) => p.price);
  const minP = Math.min(...prices) * 0.98;
  const maxP = Math.max(...prices) * 1.02;
  const range = maxP - minP || 1;

  const cx = (i: number) => PAD.l + (i / (sorted.length - 1)) * cW;
  const cy = (p: number) => PAD.t + (1 - (p - minP) / range) * cH;

  const linePath = sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${cx(i)} ${cy(p.price)}`).join(" ");
  const areaPath = `${linePath} L ${cx(sorted.length - 1)} ${H - PAD.b} L ${cx(0)} ${H - PAD.b} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.t + (1 - t) * cH,
    val: minP + t * range,
  }));

  const xTicks = [0, Math.floor(sorted.length / 2), sorted.length - 1].map((i) => ({
    x: cx(i),
    label: new Date(sorted[i].scraped_at).toLocaleDateString("en-BD", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-6">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className="px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-all dk-focus"
            style={days === d
              ? { background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--lav)" }
              : { background: "var(--surface-ghost)", border: "1px solid var(--border-sm)", color: "var(--text-faint)" }
            }
          >
            {d}D
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[500px] select-none"
          key={`${days}-${sorted.length}`}
        >
          <defs>
            <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(124,58,237,0.18)" />
              <stop offset="100%" stopColor="rgba(124,58,237,0)" />
            </linearGradient>
          </defs>
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="var(--surface-ghost)" strokeWidth={1} />
              <text x={PAD.l - 12} y={t.y + 4} textAnchor="end" fill="var(--text-faint)" fontSize={10} fontFamily="'IBM Plex Mono', monospace">
                {fmt(Math.round(t.val))}
              </text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text key={i} x={t.x} y={H - 10} textAnchor="middle" fill="var(--text-faint)" fontSize={10} fontFamily="'IBM Plex Mono', monospace">
              {t.label}
            </text>
          ))}
          <path d={areaPath} fill="url(#chartGrad)" />
          <motion.path
            d={linePath}
            fill="none"
            stroke="#7c3aed"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ pathLength: { duration: 1.5, ease: "easeInOut" }, opacity: { duration: 0.3 } }}
          />
          <motion.circle
            cx={cx(sorted.length - 1)}
            cy={cy(sorted[sorted.length - 1].price)}
            r={6}
            style={{ fill: "var(--lav)" }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.4, duration: 0.3, ease: "backOut" }}
          />
          <motion.circle
            cx={cx(sorted.length - 1)}
            cy={cy(sorted[sorted.length - 1].price)}
            r={12}
            fill="rgba(167,139,250,0.15)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.4, duration: 0.4, ease: "backOut" }}
          />
        </svg>
      </div>
    </div>
  );
}

export default function PriceChartClient({ productId }: { productId: string }) {
  const [days, setDays] = useState(30);
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/products/${productId}/price-history?days=${days}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.prices) setPoints(data.prices); })
      .finally(() => setLoading(false));
  }, [productId, days]);

  return (
    <div className="dk-card p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-body)" }}>Price History</h3>
        <span className="text-[10px] font-medium" style={{ color: "var(--text-faint)" }}>Updated every 6h</span>
      </div>
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--lav)" }} />
        </div>
      ) : (
        <PriceSparkline points={points} days={days} setDays={setDays} />
      )}
    </div>
  );
}
