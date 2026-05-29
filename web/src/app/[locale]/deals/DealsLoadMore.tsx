"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";
const PAGE_SIZE = 50;

const PLATFORM_COLOR: Record<string, string> = {
  daraz: "#f97316", cartup: "#3b82f6", rokomari: "#ef4444",
  pickaboo: "#8b5cf6", chaldal: "#22c55e", othoba: "#ec4899",
};

const PLATFORM_BG: Record<string, string> = {
  daraz: "rgba(249,115,22,0.1)", cartup: "rgba(59,130,246,0.1)", rokomari: "rgba(239,68,68,0.1)",
  pickaboo: "rgba(139,92,246,0.1)", chaldal: "rgba(34,197,94,0.1)", othoba: "rgba(236,72,153,0.1)",
};

function scoreColor(s: number): string {
  if (s >= 9) return "var(--green)";
  if (s >= 7) return "var(--lav)";
  return "var(--amber)";
}

function scoreBg(s: number): string {
  if (s >= 9) return "rgba(34,197,94,0.1)";
  if (s >= 7) return "rgba(124,58,237,0.1)";
  return "rgba(245,158,11,0.1)";
}

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
      const params = new URLSearchParams({ min_score: String(minScore), limit: String(PAGE_SIZE), offset: String(offset) });
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
        {deals.map((deal) => {
          const platColor = PLATFORM_COLOR[deal.product.platform] ?? "var(--text-muted)";
          const platBg = PLATFORM_BG[deal.product.platform] ?? "var(--surface-ghost)";
          return (
            <Link
              key={deal.product.id}
              href={`/product/${deal.product.id}`}
              className="dk-card p-5 flex flex-col gap-3 group block"
            >
              <div className="flex items-start gap-3">
                {deal.product.image_url && (
                  <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: "var(--bg3)", border: "1px solid var(--border-sm)" }}>
                    <img src={deal.product.image_url} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ color: platColor, background: platBg }}>
                    {deal.product.platform}
                  </span>
                  <p className="text-sm font-medium mt-1 line-clamp-2 leading-snug" style={{ color: "var(--text-secondary)" }}>
                    {deal.product.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(deal.product.current_price)}</span>
                {deal.avg_30d && deal.product.current_price && deal.avg_30d > deal.product.current_price && (
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ color: "var(--green)", background: "rgba(34,197,94,0.1)" }}>
                    Save {fmt(deal.avg_30d - deal.product.current_price)} vs avg
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border-sm)" }}>
                <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: scoreColor(deal.deal_score), background: scoreBg(deal.deal_score) }}>
                  Score {deal.deal_score}/10
                </span>
                <span className="text-[10px] flex items-center gap-0.5 transition-colors" style={{ color: "var(--text-faint)" }}>
                  View <ArrowUpRight size={10} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="dk-btn-primary flex items-center gap-2 disabled:opacity-50 text-sm uppercase tracking-widest"
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
        <p className="mt-10 text-center text-sm" style={{ color: "var(--text-faint)" }}>
          You&apos;ve seen all {deals.length} deals — check back tomorrow for fresh drops.
        </p>
      )}
    </>
  );
}
