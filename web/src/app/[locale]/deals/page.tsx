import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Best Deals in Bangladesh Today",
  description:
    "Verified genuine price drops across Daraz, Cartup, Rokomari, and Pickaboo — not inflated fake discounts. Updated every hour.",
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

const PLATFORMS = ["", "daraz", "cartup", "rokomari", "pickaboo"];

const PLATFORM_COLOR: Record<string, string> = {
  daraz:    "text-orange-400 bg-orange-500/10 border-orange-500/20",
  cartup:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  rokomari: "text-green-400 bg-green-500/10 border-green-500/20",
  pickaboo: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

const SCORE_COLOR = (s: number) =>
  s >= 9 ? "text-emerald-400 bg-emerald-500/10" : s >= 7 ? "text-indigo-400 bg-indigo-500/10" : "text-amber-400 bg-amber-500/10";

function fmt(p: number | null) {
  return p ? `৳${(p / 100).toLocaleString("en-BD")}` : "—";
}

async function getDeals(platform?: string, minScore = 7) {
  const params = new URLSearchParams({ min_score: String(minScore), limit: "30" });
  if (platform) params.set("platform", platform);
  try {
    const res = await fetch(`${API}/products/deals?${params}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

type DealItem = {
  product: { id: string; title: string; platform: string; current_price: number | null; image_url: string | null; url: string };
  deal_score: number; label: string; explanation: string; avg_30d: number | null;
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; score?: string }>;
}) {
  const params = await searchParams;
  const platform = params.platform ?? "";
  const minScore = parseInt(params.score ?? "7", 10);
  const deals: DealItem[] = await getDeals(platform || undefined, minScore);

  return (
    <div className="container mx-auto px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black font-outfit mb-2">🔥 Real Deals Today</h1>
        <p className="text-white/40 text-sm">
          {deals.length} verified price drops · Updated every hour
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        {PLATFORMS.map((p) => (
          <Link
            key={p}
            href={`/deals?platform=${p}`}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${
              platform === p
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
            }`}
          >
            {p || "All Platforms"}
          </Link>
        ))}
        <div className="ml-auto flex gap-2">
          {[7, 8, 9].map((s) => (
            <Link
              key={s}
              href={`/deals?platform=${platform}&score=${s}`}
              className={`px-3 py-2 rounded-full text-xs font-black border transition-all ${
                minScore === s
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
              }`}
            >
              Score ≥{s}
            </Link>
          ))}
        </div>
      </div>

      {/* Deals grid */}
      {deals.length === 0 ? (
        <div className="text-center py-20 text-white/20">
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-black uppercase tracking-widest text-sm">No deals matched your filters</p>
          <Link href="/deals" className="mt-4 inline-block text-indigo-400 text-sm hover:text-indigo-300">
            Reset filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map((deal) => (
            <Link
              key={deal.product.id}
              href={`/product/${deal.product.id}`}
              className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-300 group"
            >
              <div className="flex items-start gap-3">
                {deal.product.image_url && (
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex-shrink-0 overflow-hidden">
                    <img src={deal.product.image_url} alt="" className="w-full h-full object-contain p-1" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${PLATFORM_COLOR[deal.product.platform] ?? "text-white/40 bg-white/5 border-white/10"}`}>
                    {deal.product.platform}
                  </span>
                  <p className="text-sm font-semibold text-white/80 mt-1 line-clamp-2 leading-snug">
                    {deal.product.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-black text-lg font-mono text-white">{fmt(deal.product.current_price)}</span>
                {deal.avg_30d && deal.product.current_price && deal.avg_30d > deal.product.current_price && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                    Save {fmt(deal.avg_30d - deal.product.current_price)} vs avg
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className={`text-xs font-black px-2 py-1 rounded-full ${SCORE_COLOR(deal.deal_score)}`}>
                  Score {deal.deal_score}/10
                </span>
                <span className="text-[10px] text-white/20 font-mono uppercase group-hover:text-indigo-400 transition-colors flex items-center gap-0.5">
                  View <ArrowUpRight size={10} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
