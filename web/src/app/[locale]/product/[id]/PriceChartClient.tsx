"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, TrendingDown, TrendingUp, Minus, Flame } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

type PricePoint = { price: number; scraped_at: string };

type Range = { label: string; days: number };
const RANGES: Range[] = [
  { label: "1M",  days: 30  },
  { label: "3M",  days: 90  },
  { label: "6M",  days: 180 },
  { label: "All", days: 0   },
];

function fmt(paisa: number): string {
  return `৳${(paisa / 100).toLocaleString("en-BD")}`;
}
function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-BD", { month: "short", day: "numeric" });
}
function fmtFull(iso: string): string {
  return new Date(iso).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
}

// ── Gauge (Should you buy?) ───────────────────────────────────────
function BuyGauge({ score }: { score: number }) {
  // score 0-100. <40 bad, 40-65 fair, 65-85 good, >85 best
  const label =
    score >= 85 ? { text: "Best Time to Buy",   color: "#22c55e" } :
    score >= 65 ? { text: "Good Time to Buy",    color: "#86efac" } :
    score >= 40 ? { text: "Fair Value",          color: "#f59e0b" } :
                  { text: "Wait for Lower Price", color: "#ef4444" };

  const R = 48, cx = 64, cy = 64;
  const startAngle = -210;
  const sweepAngle = 240;
  const angle = startAngle + (score / 100) * sweepAngle;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const needleX = cx + (R - 6) * Math.cos(toRad(angle));
  const needleY = cy + (R - 6) * Math.sin(toRad(angle));

  // Arc segments: red→yellow→green
  const arcPath = (start: number, end: number) => {
    const s = toRad(startAngle + (start / 100) * sweepAngle);
    const e = toRad(startAngle + (end / 100) * sweepAngle);
    const x1 = cx + R * Math.cos(s), y1 = cy + R * Math.sin(s);
    const x2 = cx + R * Math.cos(e), y2 = cy + R * Math.sin(e);
    const large = end - start > 50 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 128 80" className="w-32 h-20">
        <path d={arcPath(0,  40)} stroke="#ef4444" strokeWidth={8} fill="none" strokeLinecap="round" />
        <path d={arcPath(40, 65)} stroke="#f59e0b" strokeWidth={8} fill="none" />
        <path d={arcPath(65, 85)} stroke="#86efac" strokeWidth={8} fill="none" />
        <path d={arcPath(85,100)} stroke="#22c55e" strokeWidth={8} fill="none" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY}
          stroke="white" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="white" />
      </svg>
      <p className="text-xs font-bold -mt-1" style={{ color: label.color }}>{label.text}</p>
    </div>
  );
}

// ── Chart ─────────────────────────────────────────────────────────
function PriceChart({
  points, days, setDays,
}: { points: PricePoint[]; days: number; setDays: (d: number) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; pt: PricePoint } | null>(null);

  const sorted = [...points].sort(
    (a, b) => new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime()
  );

  const prices = sorted.map((p) => p.price);
  const minP   = prices.length ? Math.min(...prices) : 0;
  const maxP   = prices.length ? Math.max(...prices) : 0;
  const avgP   = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const curP   = sorted.at(-1)?.price ?? 0;
  const atlIdx = sorted.findIndex((p) => p.price === minP);

  const isATL  = curP > 0 && curP <= minP * 1.01;          // within 1% of all-time low
  const buyScore = curP > 0 && avgP > 0
    ? Math.round(Math.max(0, Math.min(100, ((avgP - curP) / avgP) * 200 + 50)))
    : 50;

  const W = 760, H = 200;
  const PAD = { t: 12, r: 16, b: 32, l: 12 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const lo = minP * 0.97, hi = maxP * 1.03, rng = hi - lo || 1;
  const cx = (i: number) => PAD.l + (i / (sorted.length - 1)) * cW;
  const cy = (p: number) => PAD.t + (1 - (p - lo) / rng) * cH;

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const dx = mx - PAD.l;
    if (dx < 0 || dx > cW) { setTooltip(null); return; }
    const idx = Math.round((dx / cW) * (sorted.length - 1));
    const pt = sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
    setTooltip({ x: cx(idx), y: cy(pt.price), pt });
  }

  if (sorted.length < 2) {
    return (
      <div>
        <RangePicker days={days} setDays={setDays} />
        <p className="text-center py-12 text-sm italic" style={{ color: "var(--text-faint)" }}>
          {sorted.length === 0 ? "No price data yet." : "Need at least 2 data points."}
        </p>
      </div>
    );
  }

  const linePath = sorted.map((p, i) => `${i === 0 ? "M" : "L"} ${cx(i).toFixed(1)} ${cy(p.price).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${cx(sorted.length - 1).toFixed(1)} ${(PAD.t + cH).toFixed(1)} L ${PAD.l} ${(PAD.t + cH).toFixed(1)} Z`;

  const yTicks = [0, 0.5, 1].map((t) => ({
    y: PAD.t + (1 - t) * cH,
    val: lo + t * rng,
  }));

  const xCount = Math.min(5, sorted.length);
  const xTicks = Array.from({ length: xCount }, (_, i) => {
    const idx = Math.round((i / (xCount - 1)) * (sorted.length - 1));
    return { x: cx(idx), label: fmtShort(sorted[idx].scraped_at) };
  });

  return (
    <div className="w-full">
      {/* ATL banner */}
      {isATL && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl mb-4 text-sm font-semibold"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "var(--green)" }}>
          <Flame size={14} />
          All-Time Low! Best chance to buy!
        </div>
      )}

      <RangePicker days={days} setDays={setDays} />

      {/* Chart */}
      <div className="overflow-x-auto -mx-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[360px] select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          key={`${days}-${sorted.length}`}
        >
          <defs>
            <linearGradient id="cg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="rgba(124,58,237,0.22)" />
              <stop offset="100%" stopColor="rgba(124,58,237,0.01)" />
            </linearGradient>
            <clipPath id="cc">
              <rect x={PAD.l} y={PAD.t} width={cW} height={cH} />
            </clipPath>
          </defs>

          {/* Grid + right-side Y labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y}
                stroke="var(--border-sm)" strokeWidth={1} strokeDasharray="3 4" />
              <text x={W - PAD.r + 4} y={t.y + 4} textAnchor="start"
                fill="var(--text-ghost)" fontSize={9} fontFamily="'IBM Plex Mono',monospace">
                {fmt(Math.round(t.val))}
              </text>
            </g>
          ))}

          {/* X labels */}
          {xTicks.map((t, i) => (
            <text key={i} x={t.x} y={H - 6} textAnchor="middle"
              fill="var(--text-ghost)" fontSize={9} fontFamily="'IBM Plex Mono',monospace">
              {t.label}
            </text>
          ))}

          {/* Area + line */}
          <path d={areaPath} fill="url(#cg)" clipPath="url(#cc)" />
          <motion.path d={linePath} fill="none"
            stroke="rgba(124,58,237,0.9)" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round"
            clipPath="url(#cc)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ pathLength: { duration: 1.2, ease: "easeInOut" }, opacity: { duration: 0.2 } }}
          />

          {/* ATL marker */}
          {atlIdx >= 0 && (
            <g>
              <circle cx={cx(atlIdx)} cy={cy(minP)} r={5} fill="var(--green)" />
              <circle cx={cx(atlIdx)} cy={cy(minP)} r={10} fill="rgba(34,197,94,0.15)" />
            </g>
          )}

          {/* Current dot */}
          <motion.circle cx={cx(sorted.length - 1)} cy={cy(curP)} r={5} fill="var(--lav)"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 1.1, duration: 0.3, ease: "backOut" }} />

          {/* Hover crosshair */}
          {tooltip && (
            <g>
              <line x1={tooltip.x} y1={PAD.t} x2={tooltip.x} y2={PAD.t + cH}
                stroke="rgba(167,139,250,0.35)" strokeWidth={1} strokeDasharray="4 3" />
              <circle cx={tooltip.x} cy={tooltip.y} r={4} fill="white" />
              {(() => {
                const bW = 128, bH = 44, mg = 8;
                const flip = tooltip.x + bW + mg > W - PAD.r;
                const bx = flip ? tooltip.x - bW - mg : tooltip.x + mg;
                const by = Math.max(PAD.t, Math.min(tooltip.y - bH / 2, PAD.t + cH - bH));
                return (
                  <g>
                    <rect x={bx} y={by} width={bW} height={bH} rx={6}
                      fill="var(--bg3)" stroke="rgba(124,58,237,0.4)" strokeWidth={1} />
                    <text x={bx + 10} y={by + 17} fill="var(--lav)" fontSize={12} fontWeight="bold"
                      fontFamily="'IBM Plex Mono',monospace">{fmt(tooltip.pt.price)}</text>
                    <text x={bx + 10} y={by + 33} fill="var(--text-faint)" fontSize={9}
                      fontFamily="'IBM Plex Mono',monospace">{fmtFull(tooltip.pt.scraped_at)}</text>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        {[
          { label: "Highest Price", val: fmt(maxP), icon: <TrendingUp size={11} />, color: "var(--red)"  },
          { label: "Average Price", val: fmt(avgP), icon: <Minus size={11} />,       color: "var(--amber)" },
          { label: "Lowest Price",  val: fmt(minP), icon: <TrendingDown size={11} />, color: "var(--green)" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-3 text-center"
            style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
            <div className="flex items-center justify-center gap-1 mb-1" style={{ color: s.color }}>
              {s.icon}
              <span className="text-[9px] font-semibold uppercase tracking-widest">{s.label}</span>
            </div>
            <p className="text-sm font-bold text-white" style={{ fontFamily: "'IBM Plex Mono',monospace" }}>
              {s.val}
            </p>
          </div>
        ))}
      </div>

      {/* Should you buy? */}
      <div className="mt-5 rounded-2xl p-5 flex items-center gap-6"
        style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
        <BuyGauge score={buyScore} />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-faint)" }}>
            Should you buy this now?
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {curP <= minP * 1.01
              ? "At all-time low. Best time to buy."
              : curP <= avgP
              ? "Below average price. Good time to buy."
              : curP <= avgP * 1.1
              ? "Near average price. Acceptable to buy now."
              : "Above average price. Consider waiting for a drop."}
          </p>
          <p className="text-[9px] mt-1.5" style={{ color: "var(--text-ghost)" }}>
            Based on {sorted.length} data points
          </p>
        </div>
      </div>
    </div>
  );
}

function RangePicker({ days, setDays }: { days: number; setDays: (d: number) => void }) {
  return (
    <div className="flex gap-1.5 mb-4">
      {RANGES.map((r) => (
        <button key={r.days} onClick={() => setDays(r.days)}
          className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-all dk-focus"
          style={days === r.days
            ? { background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)", color: "var(--lav)" }
            : { background: "var(--surface-ghost)", border: "1px solid var(--border-sm)", color: "var(--text-faint)" }
          }>
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────
export default function PriceChartClient({ productId }: { productId: string }) {
  const [days, setDays] = useState(90);
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    fetch(`${API}/products/${productId}/price-history?days=${days}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.prices) setPoints(d.prices); })
      .finally(() => setLoading(false));
  }, [productId, days]);

  return (
    <div className="dk-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-body)" }}>
          Price History
        </h3>
        <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: "var(--text-ghost)" }}>
          Updated every 6h
        </span>
      </div>
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--lav)" }} />
        </div>
      ) : (
        <PriceChart points={points} days={days} setDays={setDays} />
      )}
    </div>
  );
}
