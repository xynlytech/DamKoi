import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft, ExternalLink, Sparkles, Layers,
  CheckCircle, AlertCircle, Clock, TrendingDown,
  XCircle, Flame, Circle
} from "lucide-react";
import PriceChartClient from "./PriceChartClient";
import AlertFormClient from "./AlertFormClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";
const BASE_URL = "https://damkoi.xynly.com";

// ── Types ──────────────────────────────────────────────────────

type Product = {
  id: string;
  title: string;
  platform: string;
  url: string;
  image_url: string | null;
  current_price: number | null;
  original_price: number | null;
  platform_discount_pct: number | null;
  in_stock: boolean | null;
  last_updated: string | null;
  brand?: string;
  category?: string;
};

type Verdict = {
  deal_score: number;
  label: "FAKE_DISCOUNT" | "BEST_PRICE" | "GOOD_DEAL" | "FAIR_PRICE" | "INSUFFICIENT_DATA";
  display: string;
  explanation: string;
  avg_30d: number | null;
  all_time_low: number | null;
  all_time_low_date: string | null;
  data_points: number;
  confidence: number;
};

type CompareAlternative = {
  id: string;
  platform: string;
  title: string;
  url: string;
  image_url: string | null;
  current_price: number | null;
  is_original_request: boolean;
};

type CompareResponse = {
  product_id: string;
  match_group_id: string | null;
  alternatives: CompareAlternative[];
};

type LensResponse = {
  pros: string[];
  cons: string[];
  verdict: string;
};

// ── Data fetchers ──────────────────────────────────────────────

async function getProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API}/products/${id}`, { next: { revalidate: 3600 } });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function getVerdict(id: string): Promise<Verdict | null> {
  try {
    const res = await fetch(`${API}/products/${id}/verdict`, { next: { revalidate: 3600 } });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function getCompare(id: string): Promise<CompareResponse | null> {
  try {
    const res = await fetch(`${API}/products/${id}/compare`, { next: { revalidate: 86400 } });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function getLens(id: string): Promise<LensResponse | null> {
  try {
    const res = await fetch(`${API}/products/${id}/lens`, { next: { revalidate: 86400 } });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

// ── generateMetadata ───────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) {
    return { title: "Product Not Found | DamKoi" };
  }
  const price = product.current_price
    ? `৳${(product.current_price / 100).toLocaleString("en-BD")}`
    : null;
  const title = `${product.title} – Price History Bangladesh | DamKoi`;
  const description = price
    ? `Is ${product.title} worth buying now at ${price}? See 90-day price history, fake discount detection, and price alerts. DamKoi tracks prices across Bangladesh.`
    : `90-day price history and fake discount detection for ${product.title} in Bangladesh.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/product/${id}`,
      images: [`${BASE_URL}/product/${id}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}/product/${id}/opengraph-image`],
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────

function fmt(paisa: number | null | undefined): string {
  if (!paisa) return "—";
  return `৳${(paisa / 100).toLocaleString("en-BD")}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
}

const VERDICT_CONFIG = {
  FAKE_DISCOUNT:     { icon: <XCircle size={24} />, label: "Fake Discount",  color: "#ef4444" },
  BEST_PRICE:        { icon: <CheckCircle size={24} />, label: "Best Price",      color: "#10b981" },
  GOOD_DEAL:         { icon: <Flame size={24} />, label: "Good Deal",       color: "#6366f1" },
  FAIR_PRICE:        { icon: <Circle size={24} />, label: "Fair Price",      color: "#f59e0b" },
  INSUFFICIENT_DATA: { icon: <Clock size={24} />, label: "Tracking…",       color: "#94a3b8" },
};

// ── Sub-components (server) ────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 40, circ = Math.PI * 2 * r;
  const offset = circ * (1 - score / 10);
  const color = score >= 8 ? "#10B981" : score >= 5 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative flex items-center justify-center w-28 h-28 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black font-outfit" style={{ color }}>{score}</span>
        <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Score</span>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;

  const [product, verdict, compare, lens] = await Promise.all([
    getProduct(id),
    getVerdict(id),
    getCompare(id),
    getLens(id),
  ]);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <AlertCircle size={48} className="text-rose-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black font-outfit mb-4">Product Not Found</h2>
        <p className="text-white/40 mb-10">
          This product isn't in our database yet. Paste its URL on the homepage to start tracking.
        </p>
        <Link href="/" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all">
          Track a Product
        </Link>
      </div>
    );
  }

  const vc = verdict ? VERDICT_CONFIG[verdict.label] : VERDICT_CONFIG.INSUFFICIENT_DATA;

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    image: product.image_url ? [product.image_url] : undefined,
    description: `90-day price history and fake discount detection for ${product.title} in Bangladesh.`,
    brand: { "@type": "Brand", name: product.brand || product.platform },
    offers: {
      "@type": "Offer",
      url: product.url,
      priceCurrency: "BDT",
      price: (product.current_price || 0) / 100,
      itemCondition: "https://schema.org/NewCondition",
      availability: product.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/30 hover:text-indigo-400 transition-all mb-12"
      >
        <ArrowLeft size={12} /> All Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ── Left: Intelligence ── */}
        <div className="lg:col-span-7 flex flex-col gap-8">

          {/* Title block */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                {product.platform}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span className={`text-[10px] font-black uppercase tracking-widest ${product.in_stock ? "text-emerald-400" : "text-rose-400"}`}>
                {product.in_stock === false ? "Out of Stock" : "In Stock"}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black font-outfit tracking-tight leading-tight mb-5 text-white">
              {product.title}
            </h1>
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-white/30 hover:text-indigo-400 transition-colors"
            >
              View on {product.platform} <ExternalLink size={12} />
            </a>
          </div>

          {/* Verdict card */}
          <div className="glass-card rounded-[2.5rem] p-8 relative overflow-hidden border-indigo-500/10">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              {verdict && <ScoreRing score={verdict.deal_score} />}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                  <span className="text-2xl" style={{ color: vc.color }}>{vc.icon}</span>
                  <span className="text-2xl font-black font-outfit" style={{ color: vc.color }}>
                    {vc.label}
                  </span>
                </div>
                <p className="text-white/50 leading-relaxed text-sm">
                  {verdict?.explanation ?? "We're collecting price data — check back soon."}
                </p>
                {verdict && verdict.confidence < 0.6 && (
                  <div className="mt-4 flex items-center justify-center sm:justify-start gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400/60">
                    <Clock size={12} /> {verdict.data_points} data points so far
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Price metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Current",  val: fmt(product.current_price),    hi: true },
              { label: "30D Avg",  val: fmt(verdict?.avg_30d)                   },
              { label: "All-Time Low", val: fmt(verdict?.all_time_low)          },
              { label: "Discount", val: product.platform_discount_pct ? `${product.platform_discount_pct}%` : "—" },
            ].map((m) => (
              <div key={m.label} className="glass-card rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">{m.label}</p>
                <p className={`text-sm font-black font-mono ${m.hi ? "text-indigo-400" : "text-white"}`}>{m.val}</p>
              </div>
            ))}
          </div>

          {/* AI Product Lens */}
          {lens && (
            <div className="glass-card rounded-[2.5rem] p-8 border-indigo-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Sparkles className="w-24 h-24 text-indigo-400" />
              </div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black font-outfit">Product Lens</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">AI Analysis</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-6 relative z-10">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 mb-3">
                    <CheckCircle size={12} /> Pros
                  </h4>
                  <ul className="space-y-2">
                    {lens.pros.map((pro, i) => (
                      <li key={i} className="text-sm text-white/60 pl-3 border-l-2 border-emerald-500/30 leading-snug">{pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-rose-400 flex items-center gap-2 mb-3">
                    <AlertCircle size={12} /> Cons
                  </h4>
                  <ul className="space-y-2">
                    {lens.cons.map((con, i) => (
                      <li key={i} className="text-sm text-white/60 pl-3 border-l-2 border-rose-500/30 leading-snug">{con}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {lens.verdict && (
                <div className="mt-6 pt-5 border-t border-indigo-500/20 relative z-10">
                  <p className="text-sm text-indigo-200 leading-relaxed">"{lens.verdict}"</p>
                </div>
              )}
            </div>
          )}

          {/* Price chart — client island */}
          <PriceChartClient productId={id} />

          {/* Cross-platform alternatives */}
          {compare && compare.alternatives.length > 1 && (
            <div className="glass-card rounded-[2.5rem] p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-black font-outfit">Compare Prices</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Across platforms</p>
                </div>
              </div>
              <div className="space-y-3">
                {compare.alternatives.map((alt) => (
                  <div
                    key={alt.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border ${
                      alt.is_original_request
                        ? "bg-white/5 border-white/10"
                        : "bg-black/20 border-white/5 hover:border-white/10 transition-colors"
                    }`}
                  >
                    {alt.image_url ? (
                      <img src={alt.image_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-white/5 p-1 flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">{alt.platform}</span>
                        {alt.is_original_request && (
                          <span className="text-[8px] bg-white/10 px-2 py-0.5 rounded-full text-white/40">current</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white/70 truncate">{alt.title}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-black font-mono text-white">{fmt(alt.current_price)}</p>
                      {!alt.is_original_request && (
                        <a
                          href={alt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-indigo-400/70 hover:text-indigo-400 transition-colors"
                        >
                          View →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Product image + alert + stats ── */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {product.image_url && (
            <div className="glass-card rounded-[2.5rem] p-4 border-white/5 aspect-square overflow-hidden">
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-contain rounded-[2rem]"
              />
            </div>
          )}

          {/* Alert form — client island */}
          <AlertFormClient productId={id} currentPrice={product.current_price} />

          {/* Market stats */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingDown size={13} className="text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Market Stats</span>
            </div>
            <div className="space-y-3">
              {[
                { label: "Data Points", val: String(verdict?.data_points ?? 0) },
                { label: "Last Updated", val: fmtDate(product.last_updated) },
                { label: "Confidence",   val: `${Math.round((verdict?.confidence ?? 0) * 100)}%` },
                ...(verdict?.all_time_low_date ? [{ label: "ATL Date", val: fmtDate(verdict.all_time_low_date) }] : []),
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{row.label}</span>
                  <span className="text-xs font-mono font-bold text-white/50">{row.val}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
