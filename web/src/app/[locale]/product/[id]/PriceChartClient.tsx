"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

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
      <div className="text-center py-10 text-white/20 font-medium italic text-sm">
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
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
              days === d
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                : "bg-white/5 border-white/5 text-white/20 hover:border-white/10"
            }`}
          >
            {d}D
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto min-w-[500px] select-none">
          <defs>
            <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.2)" />
              <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
            </linearGradient>
          </defs>
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
              <text x={PAD.l - 12} y={t.y + 4} textAnchor="end" className="fill-white/20 font-mono" fontSize={10}>
                {fmt(Math.round(t.val))}
              </text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text key={i} x={t.x} y={H - 10} textAnchor="middle" className="fill-white/20 font-mono" fontSize={10}>
              {t.label}
            </text>
          ))}
          <path d={areaPath} fill="url(#chartGrad)" />
          <path d={linePath} fill="none" stroke="#6366F1" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={cx(sorted.length - 1)} cy={cy(sorted[sorted.length - 1].price)} r={6} fill="#818cf8" />
          <circle cx={cx(sorted.length - 1)} cy={cy(sorted[sorted.length - 1].price)} r={10} fill="rgba(129,140,248,0.2)" />
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
    <div className="nm-raised rounded-2xl p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-black uppercase tracking-widest font-outfit">Price History</h3>
        <span className="text-[10px] font-bold text-white/20">Updated every 6h</span>
      </div>
      {loading ? (
        <div className="h-40 flex items-center justify-center text-white/20 text-sm">Loading chart…</div>
      ) : (
        <PriceSparkline points={points} days={days} setDays={setDays} />
      )}
    </div>
  );
}
