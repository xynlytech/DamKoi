"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import DealCard, { type DealItem } from "@/components/DealCard";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";
const PAGE_SIZE = 50;

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
        {deals.map((deal) => (
          <DealCard key={deal.product.id} deal={deal} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="dk-btn-secondary"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Loading…</>
            ) : (
              "Show more deals"
            )}
          </button>
        </div>
      )}

      {!hasMore && deals.length > PAGE_SIZE && (
        <p className="mt-10 text-center text-sm" style={{ color: "var(--text-faint)" }}>
          That&apos;s all {deals.length} deals for now. New price drops show up every day.
        </p>
      )}
    </>
  );
}
