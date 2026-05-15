import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Trophy, AlertTriangle, Search } from "lucide-react";
import ReportButtonClient from "./ReportButtonClient";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

const PLATFORM_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  daraz:    { color: "#f97316", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.2)"  },
  cartup:   { color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.2)"  },
  rokomari: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.2)"   },
  pickaboo: { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  border: "rgba(139,92,246,0.2)"  },
  chaldal:  { color: "#14b8a6", bg: "rgba(20,184,166,0.1)",  border: "rgba(20,184,166,0.2)"  },
  othoba:   { color: "#ec4899", bg: "rgba(236,72,153,0.1)",  border: "rgba(236,72,153,0.2)"  },
};

function fmt(p: number | null) {
  return p != null ? `৳${(p / 100).toLocaleString("en-BD")}` : "—";
}

type CompareItem = {
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
  alternatives: CompareItem[];
};

async function getCompare(productId: string): Promise<CompareResponse | null> {
  try {
    const res = await fetch(`${API}/products/${productId}/compare`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCompare(slug);
  const original = data?.alternatives.find((a) => a.is_original_request);
  const title = original?.title ?? "Product";
  return {
    title: `${title} — Compare Prices Across Platforms | DamKoi`,
    description: `See ${title} on every platform in Bangladesh. Find the cheapest price across Daraz, Cartup, Rokomari, Pickaboo, Chaldal, and Othoba instantly.`,
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCompare(slug);

  if (!data) {
    return (
      <div className="container mx-auto px-4 max-w-4xl py-20 text-center">
        <Search size={48} className="mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
        <h1 className="text-2xl font-black mb-2">Product not found</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>This product does not exist or was removed.</p>
        <Link href="/" style={{ color: "var(--lav)" }} className="text-sm hover:opacity-80 transition-opacity">← Back to homepage</Link>
      </div>
    );
  }

  const { alternatives } = data;
  const original = alternatives.find((a) => a.is_original_request);
  const cheapest = alternatives.reduce<CompareItem | null>((best, cur) => {
    if (cur.current_price == null) return best;
    if (best == null || best.current_price == null) return cur;
    return cur.current_price < best.current_price ? cur : best;
  }, null);

  const noMatches = alternatives.length <= 1;

  return (
    <div className="container mx-auto px-4 max-w-4xl">
      <Link
        href={`/product/${slug}`}
        className="inline-flex items-center gap-1 text-sm mb-8 transition-opacity hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} /> Back to product
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">Cross-Platform Price Compare</h1>
        {original && (
          <p className="text-sm line-clamp-2" style={{ color: "var(--text-muted)" }}>{original.title}</p>
        )}
      </div>

      {noMatches ? (
        <div className="dk-card p-10 text-center">
          <AlertTriangle size={32} className="mx-auto mb-4" style={{ color: "var(--amber)" }} />
          <h2 className="font-black text-lg mb-2">No cross-platform matches yet</h2>
          <p className="text-sm max-w-xs mx-auto" style={{ color: "var(--text-muted)" }}>
            Our matching engine has not clustered this product across platforms yet.
            Check back in a few hours.
          </p>
          <Link
            href={`/product/${slug}`}
            className="mt-6 inline-block text-sm hover:opacity-80 transition-opacity"
            style={{ color: "var(--lav)" }}
          >
            View price history instead →
          </Link>
        </div>
      ) : (
        <>
          {cheapest && (
            <div
              className="flex items-center gap-3 rounded-2xl px-5 py-3 mb-6"
              style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <Trophy size={18} className="shrink-0" style={{ color: "var(--green)" }} />
              <p className="text-sm" style={{ color: "rgba(34,197,94,0.9)" }}>
                Cheapest on{" "}
                <span className="font-black capitalize">{cheapest.platform}</span>{" "}
                at <span className="font-black" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(cheapest.current_price)}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {alternatives.map((item) => {
              const isCheapest = cheapest?.id === item.id;
              const isOriginal = item.is_original_request;
              const priceDelta =
                original?.current_price != null && item.current_price != null && !isOriginal
                  ? item.current_price - original.current_price
                  : null;
              const pc = PLATFORM_COLOR[item.platform];

              return (
                <div
                  key={item.id}
                  className="dk-card p-5 flex flex-col gap-4 relative"
                  style={isCheapest ? { border: "1px solid rgba(34,197,94,0.3)" } : undefined}
                >
                  {isCheapest && (
                    <div
                      className="absolute -top-2.5 left-4 text-white text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full"
                      style={{ background: "#16a34a", color: "#ffffff" }}
                    >
                      Cheapest
                    </div>
                  )}
                  {isOriginal && !isCheapest && (
                    <div
                      className="absolute -top-2.5 left-4 text-white text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full"
                      style={{ background: "var(--purple)", color: "#ffffff" }}
                    >
                      You viewed
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    {item.image_url && (
                      <div
                        className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden"
                        style={{ background: "var(--bg3)", border: "1px solid var(--border-sm)" }}
                      >
                        <img src={item.image_url} alt="" className="w-full h-full object-contain p-1" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={pc
                          ? { color: pc.color, background: pc.bg, border: `1px solid ${pc.border}` }
                          : { color: "var(--text-muted)", background: "var(--surface-ghost)", border: "1px solid var(--border-sm)" }
                        }
                      >
                        {item.platform}
                      </span>
                      <p className="text-sm font-semibold mt-1 line-clamp-2 leading-snug" style={{ color: "var(--text-secondary)" }}>
                        {item.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <span className="font-black text-xl text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {fmt(item.current_price)}
                    </span>
                    {priceDelta !== null && (
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full"
                        style={priceDelta < 0
                          ? { color: "var(--green)", background: "rgba(34,197,94,0.1)" }
                          : { color: "var(--red)", background: "rgba(239,68,68,0.1)" }
                        }
                      >
                        {priceDelta < 0 ? `Save ${fmt(Math.abs(priceDelta))}` : `+${fmt(priceDelta)}`}
                      </span>
                    )}
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-black uppercase tracking-widest transition-opacity hover:opacity-80"
                    style={{ background: "var(--bg3)", border: "1px solid var(--border-sm)", color: "var(--text-body)" }}
                  >
                    Buy on {item.platform} <ExternalLink size={11} />
                  </a>
                </div>
              );
            })}
          </div>

          <ReportButtonClient productId={slug} />
        </>
      )}
    </div>
  );
}
