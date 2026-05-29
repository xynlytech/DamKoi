import type { Metadata } from "next";
import Link from "next/link";
import {
  ExternalLink, Sparkles, Layers,
  CheckCircle, AlertCircle, Clock, TrendingDown,
  XCircle, Flame, Circle
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import PriceChartClient from "./PriceChartClient";
import AlertFormClient from "./AlertFormClient";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";
const BASE_URL = "https://damkoi.xynly.com";

// Non-pre-built product IDs are still served via on-demand SSR and then cached.
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API}/products?limit=500`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const products: { id: string }[] = Array.isArray(data) ? data : (data.products ?? []);
    return (["en", "bn"] as const).flatMap((locale) =>
      products.map((p) => ({ locale, id: p.id }))
    );
  } catch {
    return [];
  }
}

const PLATFORM_COLOR: Record<string, string> = {
  daraz: "#f97316", cartup: "#3b82f6", rokomari: "#ef4444",
  pickaboo: "#8b5cf6", chaldal: "#22c55e", othoba: "#ec4899",
};

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
  tracking_days?: number;
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
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const [product, verdict] = await Promise.all([getProduct(id), getVerdict(id)]);
  if (!product) {
    return { title: "Product Not Found | DamKoi" };
  }
  const price = product.current_price
    ? `৳${(product.current_price / 100).toLocaleString("en-BD")}`
    : null;
  // Layout template appends " | DamKoi"; don't repeat it here.
  const title = `${product.title} – Price History Bangladesh`;
  const description = price
    ? `Is ${product.title} worth buying now at ${price}? See 90-day price history, fake discount detection, and price alerts. DamKoi tracks prices across Bangladesh.`
    : `90-day price history and fake discount detection for ${product.title} in Bangladesh.`;

  // Index gate: only let Google index pages carrying a real verdict (≥5 price
  // points). Thin "still tracking" pages stay crawlable (follow) but out of the
  // index — stops 200k near-identical pages triggering scaled-content abuse.
  // Pages auto-promote once price history accumulates.
  const indexable =
    !!product.current_price && !!verdict && verdict.label !== "INSUFFICIENT_DATA";

  return {
    title,
    description,
    robots: { index: indexable, follow: true },
    alternates: {
      // Consolidate ranking on the English URL; declare both language variants.
      canonical: `${BASE_URL}/en/product/${id}`,
      languages: {
        en: `${BASE_URL}/en/product/${id}`,
        bn: `${BASE_URL}/bn/product/${id}`,
        "x-default": `${BASE_URL}/en/product/${id}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/product/${id}`,
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
  FAKE_DISCOUNT:     { icon: <XCircle size={22} />,     label: "Fake Discount",      color: "#ef4444" },
  BEST_PRICE:        { icon: <CheckCircle size={22} />, label: "Best Price",          color: "#22c55e" },
  GOOD_DEAL:         { icon: <Flame size={22} />,       label: "Good Deal",           color: "var(--purple)" },
  FAIR_PRICE:        { icon: <Circle size={22} />,      label: "Fair Price",          color: "#f59e0b" },
  INSUFFICIENT_DATA: { icon: <Clock size={22} />,       label: "Tracking…",      color: "#94a3b8" },
};

// ── Sub-components (server) ────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 40, circ = Math.PI * 2 * r;
  const offset = circ * (1 - score / 10);
  const color = score >= 8 ? "#22c55e" : score >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center w-28 h-28 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--surface-ghost)" strokeWidth="8" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black" style={{ color, fontFamily: "'IBM Plex Mono', monospace" }}>{score}</span>
        <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Score</span>
      </div>
    </div>
  );
}

// Real, per-product prose built only from tracked data. Renders only on pages
// with a computed verdict (the same pages we let Google index) so indexed pages
// clear the thin-content floor with genuinely unique text.
function PriceSummary({ product, verdict }: { product: Product; verdict: Verdict }) {
  const platform = product.platform.charAt(0).toUpperCase() + product.platform.slice(1);
  const lines: string[] = [];
  lines.push(
    `As of ${fmtDate(product.last_updated)}, ${product.title} is listed at ${fmt(product.current_price)} on ${platform} in Bangladesh.`,
  );
  if (product.original_price && product.current_price && product.original_price > product.current_price) {
    const off = Math.round((1 - product.current_price / product.original_price) * 100);
    lines.push(`That is ${off}% below its ${fmt(product.original_price)} list price.`);
  }
  if (verdict.tracking_days && verdict.tracking_days > 0) {
    lines.push(`DamKoi has tracked this listing for ${verdict.tracking_days} days.`);
  }
  if (verdict.avg_30d && verdict.data_points > 1) {
    lines.push(`Its 30-day average price is ${fmt(verdict.avg_30d)}.`);
  }
  if (verdict.all_time_low && verdict.data_points > 1) {
    lines.push(
      `The lowest price recorded is ${fmt(verdict.all_time_low)}${
        verdict.all_time_low_date ? ` (on ${fmtDate(verdict.all_time_low_date)})` : ""
      }.`,
    );
  }
  lines.push(verdict.explanation);

  return (
    <section className="dk-card p-8">
      <h2 className="text-base font-bold text-white mb-4">
        {product.title} — Price Analysis
      </h2>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {lines.join(" ")}
      </p>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const [product, verdict, compare, lens] = await Promise.all([
    getProduct(id),
    getVerdict(id),
    getCompare(id),
    getLens(id),
  ]);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <AlertCircle size={48} className="mx-auto mb-6" style={{ color: "var(--red)" }} />
        <h2 className="text-2xl font-bold mb-4 text-white">Product Not Found</h2>
        <p className="mb-10" style={{ color: "var(--text-muted)" }}>
          This product is not in our database yet. Paste its URL on the homepage to start tracking.
        </p>
        <Link href="/" className="dk-btn-primary inline-flex text-xs uppercase tracking-widest dk-focus">
          Track a Product
        </Link>
      </div>
    );
  }

  const vc = verdict ? VERDICT_CONFIG[verdict.label] : VERDICT_CONFIG.INSUFFICIENT_DATA;
  const platformColor = PLATFORM_COLOR[product.platform] ?? "var(--text-muted)";

  // ── Structured data ──
  // Price offers must reflect real, current prices only. No price → no Offer
  // node (Google rejects price:0). Junk brands ("No Brand"/"Generic") are
  // dropped rather than asserted.
  const priceBDT =
    product.current_price && product.current_price > 0
      ? product.current_price / 100
      : null;

  // Google wants a future priceValidUntil; our prices re-scrape well within 14d.
  const priceValidUntil = (() => {
    const d = product.last_updated ? new Date(product.last_updated) : new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  })();

  // Cross-platform alternatives with real prices → AggregateOffer (the canonical
  // schema for a price-comparison page). Falls back to a single Offer.
  const altOffers = (compare?.alternatives ?? []).filter(
    (a): a is CompareAlternative & { current_price: number } =>
      typeof a.current_price === "number" && a.current_price > 0,
  );

  let offers: Record<string, unknown> | undefined;
  if (altOffers.length > 1) {
    const prices = altOffers.map((a) => a.current_price / 100);
    offers = {
      "@type": "AggregateOffer",
      priceCurrency: "BDT",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: altOffers.length,
      offers: altOffers.map((a) => ({
        "@type": "Offer",
        url: a.url,
        priceCurrency: "BDT",
        price: a.current_price / 100,
        availability: "https://schema.org/InStock",
      })),
    };
  } else if (priceBDT !== null) {
    offers = {
      "@type": "Offer",
      url: product.url,
      priceCurrency: "BDT",
      price: priceBDT,
      priceValidUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product.in_stock === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    };
  }

  const realBrand =
    product.brand && !/^(no brand|generic|unbranded)$/i.test(product.brand)
      ? product.brand
      : null;

  const productLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    image: product.image_url ? [product.image_url] : undefined,
    description: `90-day price history and fake discount detection for ${product.title} in Bangladesh.`,
    sku: product.id,
    ...(realBrand ? { brand: { "@type": "Brand", name: realBrand } } : {}),
    ...(product.category ? { category: product.category } : {}),
    ...(offers ? { offers } : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org/",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/en` },
      ...(product.category
        ? [{ "@type": "ListItem", position: 2, name: product.category, item: `${BASE_URL}/en/deals` }]
        : []),
      {
        "@type": "ListItem",
        position: product.category ? 3 : 2,
        name: product.title,
        item: `${BASE_URL}/en/product/${id}`,
      },
    ],
  };

  const jsonLd = [productLd, breadcrumbLd];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb — mirrors BreadcrumbList schema, adds internal links */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] mb-12"
        style={{ color: "var(--text-faint)" }}
      >
        <Link href="/" className="hover:underline dk-focus">Home</Link>
        <span>/</span>
        <Link href="/deals" className="hover:underline dk-focus">Deals</Link>
        {product.category && (
          <>
            <span>/</span>
            <span style={{ color: "var(--text-muted)" }}>{product.category}</span>
          </>
        )}
        <span>/</span>
        <span className="truncate max-w-[40vw]" style={{ color: "var(--text-muted)" }}>
          {product.title}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ── Left: Intelligence ── */}
        <div className="lg:col-span-7 flex flex-col gap-8">

          {/* Title block */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: platformColor }}>
                {product.platform}
              </span>
              <span className="w-1 h-1 rounded-full" style={{ background: "var(--text-ghost)" }} />
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: product.in_stock === false ? "var(--red)" : "var(--green)" }}>
                {product.in_stock === false ? "Out of Stock" : "In Stock"}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-5 text-white">
              {product.title}
            </h1>
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-medium transition-colors dk-focus"
              style={{ color: "var(--text-faint)" }}
            >
              View on {product.platform} <ExternalLink size={12} />
            </a>
          </div>

          {/* Verdict card */}
          <div className="dk-card p-8 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              {verdict && <ScoreRing score={verdict.deal_score} />}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-3" style={{ color: vc.color }}>
                  {vc.icon}
                  <span className="text-2xl font-bold">{vc.label}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {verdict?.explanation ?? "We're collecting price data — check back soon."}
                </p>
                {verdict && verdict.confidence < 0.6 && (
                  <div className="mt-4 flex items-center justify-center sm:justify-start gap-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(167,139,250,0.6)" }}>
                    <Clock size={12} /> {verdict.data_points} data points so far
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Price metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Current",      val: fmt(product.current_price),          hi: true },
              { label: "30D Avg",      val: fmt(verdict?.avg_30d)                         },
              { label: "All-Time Low", val: fmt(verdict?.all_time_low)                    },
              { label: "Discount",     val: product.platform_discount_pct ? `${product.platform_discount_pct}%` : "—" },
            ].map((m) => (
              <div key={m.label} className="dk-card p-4">
                <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-faint)" }}>{m.label}</p>
                <p className="text-sm font-semibold" style={{ color: m.hi ? "var(--lav)" : "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>{m.val}</p>
              </div>
            ))}
          </div>

          {/* Price analysis — real prose, also the indexable-content signal */}
          {verdict && verdict.label !== "INSUFFICIENT_DATA" && (
            <PriceSummary product={product} verdict={verdict} />
          )}

          {/* AI Product Lens */}
          {lens && (
            <div className="dk-card p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Sparkles className="w-24 h-24" style={{ color: "var(--lav)" }} />
              </div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
                  <Sparkles size={18} style={{ color: "var(--lav)" }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Product Lens</h3>
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--lav)" }}>AI Analysis</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-6 relative z-10">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2 mb-3" style={{ color: "var(--green)" }}>
                    <CheckCircle size={12} /> Pros
                  </h4>
                  <ul className="space-y-2">
                    {lens.pros.map((pro, i) => (
                      <li key={i} className="text-sm pl-3 leading-snug" style={{ color: "var(--text-body)", borderLeft: "2px solid rgba(34,197,94,0.3)" }}>{pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2 mb-3" style={{ color: "var(--red)" }}>
                    <AlertCircle size={12} /> Cons
                  </h4>
                  <ul className="space-y-2">
                    {lens.cons.map((con, i) => (
                      <li key={i} className="text-sm pl-3 leading-snug" style={{ color: "var(--text-body)", borderLeft: "2px solid rgba(239,68,68,0.3)" }}>{con}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {lens.verdict && (
                <div className="mt-6 pt-5 relative z-10" style={{ borderTop: "1px solid rgba(124,58,237,0.2)" }}>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(196,181,253,0.8)" }}>&quot;{lens.verdict}&quot;</p>
                </div>
              )}
            </div>
          )}

          {/* Price chart — client island */}
          <PriceChartClient productId={id} />

          {/* Cross-platform alternatives */}
          {compare && compare.alternatives.length > 1 && (
            <div className="dk-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
                  <Layers size={16} style={{ color: "var(--lav)" }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Compare Prices</h3>
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Across platforms</p>
                </div>
              </div>
              <div className="space-y-3">
                {compare.alternatives.map((alt) => {
                  const altColor = PLATFORM_COLOR[alt.platform] ?? "var(--text-muted)";
                  return (
                    <div
                      key={alt.id}
                      className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                      style={alt.is_original_request
                        ? { background: "var(--bg3)", border: "1px solid var(--border-sm)" }
                        : { background: "var(--bg2)", border: "1px solid var(--border-sm)" }
                      }
                    >
                      {alt.image_url ? (
                        <img src={alt.image_url} alt="" className="w-12 h-12 rounded-xl object-contain p-1 flex-shrink-0" style={{ background: "var(--bg3)" }} loading="lazy" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ background: "var(--bg3)" }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: altColor }}>{alt.platform}</span>
                          {alt.is_original_request && (
                            <span className="text-[8px] px-2 py-0.5 rounded-full" style={{ background: "var(--border-sm)", color: "var(--text-faint)" }}>current</span>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-body)" }}>{alt.title}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-semibold text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(alt.current_price)}</p>
                        {!alt.is_original_request && (
                          <a
                            href={alt.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-medium transition-colors dk-focus"
                            style={{ color: "rgba(167,139,250,0.7)" }}
                          >
                            View →
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Product image + alert + stats ── */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {product.image_url && (
            <div className="dk-card p-4 aspect-square overflow-hidden">
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-contain rounded-2xl"
              />
            </div>
          )}

          {/* Alert form — client island */}
          <AlertFormClient productId={id} currentPrice={product.current_price} />

          {/* Market stats */}
          <div className="dk-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingDown size={13} style={{ color: "var(--lav)" }} />
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Market Stats</span>
            </div>
            <div className="space-y-0">
              {[
                { label: "Data Points", val: String(verdict?.data_points ?? 0) },
                { label: "Last Updated", val: fmtDate(product.last_updated) },
                { label: "Confidence",   val: `${Math.round((verdict?.confidence ?? 0) * 100)}%` },
                ...(verdict?.all_time_low_date ? [{ label: "ATL Date", val: fmtDate(verdict.all_time_low_date) }] : []),
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2.5 last:border-0" style={{ borderBottom: "1px solid var(--border-sm)" }}>
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{row.label}</span>
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
