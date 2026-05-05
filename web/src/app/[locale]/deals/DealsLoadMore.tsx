"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";
const PAGE_SIZE = 50;

const PLATFORM_COLOR: Record<string, string> = {
  daraz:    "text-orange-400 bg-orange-500/10 border-orange-500/20",
  cartup:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  rokomari: "text-green-400 bg-green-500/10 border-green-500/20",
  pickaboo: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  chaldal:  "text-teal-400 bg-teal-500/10 border-teal-500/20",
  othoba:   "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const SCORE_COLOR = (s: number) =>
  s >= 9 ? "text-emerald-400 bg-emerald-500/10"
  : s >= 7 ? "text-indigo-400 bg-indigo-500/10"
  : "text-amber-400 bg-amber-500/10";

function fmt(p: number | null) {
  return p ? `৳${(p / 100).toLocaleString("en-BD")}` : "—";
}

type DealItem = {
  product: { id: string; title: string; platform: string; current_price: number | null; image_url: string | null };
  deal_score: number;
  avg_30d: number | null;
};

type Props = {
  initialDeals: DealItem[];
  platform: string;
  category: string;
  minScore: number;
};

export default function DealsLoadMore({ initialDeals, platform, category, minScore }: Props) {
  const [deals, setDeals] = useState<DealItem[]>(initialDeals);
  const [offset, setOffset] = useState(initialDeals.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialDeals.length >= PAGE_SIZE);

  async function loadMore() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        min_score: String(minScore),
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (platform) params.set("platform", platform);
      if (category) params.set("category", category);

      const res = await fetch(`${API}/products/deals?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const next: DealItem[] = await res.json();
      setDeals((prev) => [...prev, ...next]);
      setOffset((prev) => prev + next.length);
      if (next.length < PAGE_SIZE) setHasMore(false);
    } catch {
      // silent — user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Loading…</>
            ) : (
              "Load More Deals"
            )}
          </button>
        </div>
      )}

      {!hasMore && deals.length > PAGE_SIZE && (
        <p className="mt-10 text-center text-white/20 text-sm">
          You&apos;ve seen all {deals.length} deals — check back tomorrow for fresh drops.
        </p>
      )}
    </>
  );
}
