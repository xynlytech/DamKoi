import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Search } from "lucide-react";
import DealsLoadMore from "./DealsLoadMore";

export const metadata: Metadata = {
  title: "Best Deals in Bangladesh Today",
  description:
    "Verified genuine price drops across Daraz, Cartup, Rokomari, Pickaboo, Chaldal, and Othoba — not inflated fake discounts. Updated every hour.",
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";
const PAGE_SIZE = 50;

const PLATFORMS = ["", "daraz", "cartup", "rokomari", "pickaboo", "chaldal", "othoba"];
const CATEGORIES = [
  "", "electronics", "mobile", "laptop", "fashion", "grocery", "books",
  "home", "beauty", "sports", "toys",
];

type DealItem = {
  product: { id: string; title: string; platform: string; current_price: number | null; image_url: string | null };
  deal_score: number; label: string; explanation: string; avg_30d: number | null;
};

async function getDeals(platform?: string, category?: string, minScore = 7): Promise<DealItem[]> {
  const params = new URLSearchParams({ min_score: String(minScore), limit: String(PAGE_SIZE), offset: "0" });
  if (platform) params.set("platform", platform);
  if (category) params.set("category", category);
  try {
    const res = await fetch(`${API}/products/deals?${params}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; category?: string; score?: string }>;
}) {
  const sp = await searchParams;
  const platform = sp.platform ?? "";
  const category = sp.category ?? "";
  const minScore = parseInt(sp.score ?? "7", 10);
  const deals = await getDeals(platform || undefined, category || undefined, minScore);

  return (
    <div className="container mx-auto px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black font-outfit mb-2 flex items-center gap-3">
          <Flame size={32} className="text-indigo-500" /> Real Deals Today
        </h1>
        <p className="text-white/40 text-sm">
          {deals.length}+ verified price drops · Updated every hour
        </p>
      </div>

      {/* Platform filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PLATFORMS.map((p) => (
          <Link
            key={p}
            href={`/deals?platform=${p}&category=${category}&score=${minScore}`}
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
              href={`/deals?platform=${platform}&category=${category}&score=${s}`}
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

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/deals?platform=${platform}&category=${c}&score=${minScore}`}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold capitalize border transition-all ${
              category === c
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-white/5 border-white/10 text-white/30 hover:border-white/20"
            }`}
          >
            {c || "All Categories"}
          </Link>
        ))}
      </div>

      {/* Deals grid + Load More */}
      {deals.length === 0 ? (
        <div className="text-center py-20 text-white/20">
          <div className="flex justify-center mb-4 text-white/20">
            <Search size={48} strokeWidth={1.5} />
          </div>
          <p className="font-black uppercase tracking-widest text-sm">No deals matched your filters</p>
          <Link href="/deals" className="mt-4 inline-block text-indigo-400 text-sm hover:text-indigo-300">
            Reset filters
          </Link>
        </div>
      ) : (
        <DealsLoadMore
          initialDeals={deals}
          platform={platform}
          category={category}
          minScore={minScore}
        />
      )}
    </div>
  );
}
