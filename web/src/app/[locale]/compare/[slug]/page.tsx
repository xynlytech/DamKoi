import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Trophy, AlertTriangle, Search } from "lucide-react";
import ReportButtonClient from "./ReportButtonClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

const PLATFORM_COLOR: Record<string, string> = {
  daraz:    "text-orange-400 bg-orange-500/10 border-orange-500/20",
  cartup:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  rokomari: "text-green-400 bg-green-500/10 border-green-500/20",
  pickaboo: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  chaldal:  "text-teal-400 bg-teal-500/10 border-teal-500/20",
  othoba:   "text-rose-400 bg-rose-500/10 border-rose-500/20",
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
        <Search size={48} className="text-white/20 mx-auto mb-4" />
        <h1 className="text-2xl font-black mb-2">Product not found</h1>
        <p className="text-white/40 mb-6 text-sm">This product doesn't exist or was removed.</p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">← Back to homepage</Link>
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
        className="inline-flex items-center gap-1 text-white/40 hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={14} /> Back to product
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-black font-outfit mb-2">Cross-Platform Price Compare</h1>
        {original && (
          <p className="text-white/50 text-sm line-clamp-2">{original.title}</p>
        )}
      </div>

      {noMatches ? (
        <div className="nm-raised rounded-2xl p-10 text-center">
          <AlertTriangle size={32} className="mx-auto text-amber-400 mb-4" />
          <h2 className="font-black text-lg mb-2">No cross-platform matches yet</h2>
          <p className="text-white/40 text-sm max-w-xs mx-auto">
            Our matching engine hasn't clustered this product across platforms yet.
            Check back in a few hours.
          </p>
          <Link href={`/product/${slug}`} className="mt-6 inline-block text-indigo-400 text-sm hover:text-indigo-300">
            View price history instead →
          </Link>
        </div>
      ) : (
        <>
          {cheapest && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3 mb-6">
              <Trophy size={18} className="text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300">
                Cheapest on{" "}
                <span className="font-black capitalize">{cheapest.platform}</span>{" "}
                at <span className="font-black font-mono">{fmt(cheapest.current_price)}</span>
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

              return (
                <div
                  key={item.id}
                  className={`nm-raised rounded-2xl p-5 flex flex-col gap-4 relative ${
                    isCheapest ? "ring-1 ring-emerald-500/40" : ""
                  }`}
                >
                  {isCheapest && (
                    <div className="absolute -top-2.5 left-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full">
                      Cheapest
                    </div>
                  )}
                  {isOriginal && !isCheapest && (
                    <div className="absolute -top-2.5 left-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full">
                      You viewed
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    {item.image_url && (
                      <div className="w-12 h-12 rounded-xl nm-inset flex-shrink-0 overflow-hidden">
                        <img src={item.image_url} alt="" className="w-full h-full object-contain p-1" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          PLATFORM_COLOR[item.platform] ?? "text-white/40 bg-white/5 border-white/10"
                        }`}
                      >
                        {item.platform}
                      </span>
                      <p className="text-sm font-semibold text-white/80 mt-1 line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <span className="font-black text-xl font-mono text-white">
                      {fmt(item.current_price)}
                    </span>
                    {priceDelta !== null && (
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${
                          priceDelta < 0
                            ? "text-emerald-400 bg-emerald-500/10"
                            : "text-red-400 bg-red-500/10"
                        }`}
                      >
                        {priceDelta < 0 ? `Save ${fmt(Math.abs(priceDelta))}` : `+${fmt(priceDelta)}`}
                      </span>
                    )}
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 nm-raised nm-interactive rounded-xl py-2 text-xs font-black uppercase tracking-widest text-white/60 hover:text-white"
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
