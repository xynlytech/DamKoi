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

const activeFilterStyle = { background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--lav)" };
const inactiveFilterStyle = { background: "var(--surface-ghost)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" };

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
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3 text-white">
          <Flame size={32} style={{ color: "var(--purple)" }} /> Real Deals Today
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {deals.length}+ verified price drops · Updated every hour
        </p>
      </div>

      {/* Platform filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PLATFORMS.map((p) => (
          <Link
            key={p}
            href={`/deals?platform=${p}&category=${category}&score=${minScore}`}
            className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest transition-all"
            style={platform === p ? activeFilterStyle : inactiveFilterStyle}
          >
            {p || "All Platforms"}
          </Link>
        ))}
        <div className="ml-auto flex gap-2">
          {[7, 8, 9].map((s) => (
            <Link
              key={s}
              href={`/deals?platform=${platform}&category=${category}&score=${s}`}
              className="px-3 py-2 rounded-full text-xs font-semibold transition-all"
              style={minScore === s ? activeFilterStyle : inactiveFilterStyle}
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
            className="px-3 py-1.5 rounded-full text-[11px] font-medium capitalize transition-all"
            style={category === c ? activeFilterStyle : { ...inactiveFilterStyle, color: "var(--text-faint)" }}
          >
            {c || "All Categories"}
          </Link>
        ))}
      </div>

      {/* Deals grid + Load More */}
      {deals.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)", color: "var(--text-faint)" }}>
            <Search size={36} strokeWidth={1.5} />
          </div>
          <p className="font-semibold uppercase tracking-widest text-sm mb-4" style={{ color: "var(--text-faint)" }}>
            No deals matched your filters
          </p>
          <Link href="/deals" className="text-sm font-semibold transition-colors dk-focus" style={{ color: "var(--lav)" }}>
            Reset filters
          </Link>
        </div>
      ) : (
        <DealsLoadMore initialDeals={deals} platform={platform} category={category} minScore={minScore} />
      )}
    </div>
  );
}
