import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import DealsLoadMore from "./DealsLoadMore";
import type { DealItem } from "@/components/DealCard";
import { SERVER_API } from "@/lib/server-api";

const BASE_URL = "https://damkoi.xynly.com";

export const metadata: Metadata = {
  title: "Best Deals in Bangladesh Today",
  description:
    "Verified genuine price drops across Daraz, Cartup, Rokomari, Pickaboo, Chaldal, and Othoba — not inflated fake discounts. Refreshed every day.",
  alternates: {
    canonical: `${BASE_URL}/en/deals`,
    languages: {
      en: `${BASE_URL}/en/deals`,
      bn: `${BASE_URL}/bn/deals`,
      "x-default": `${BASE_URL}/en/deals`,
    },
  },
};

const PAGE_SIZE = 50;

const PLATFORMS = ["", "daraz", "cartup", "rokomari", "pickaboo", "chaldal", "othoba"];
const CATEGORIES = [
  "", "electronics", "mobile", "laptop", "fashion", "grocery", "books",
  "home", "beauty", "sports", "toys",
];

async function getDeals(platform?: string, category?: string, minScore = 7): Promise<DealItem[]> {
  const params = new URLSearchParams({ min_score: String(minScore), limit: String(PAGE_SIZE), offset: "0" });
  if (platform) params.set("platform", platform);
  if (category) params.set("category", category);
  try {
    const res = await fetch(`${SERVER_API}/products/deals?${params}`, { next: { revalidate: 14400 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const activeFilterStyle = { background: "var(--purple)", border: "1px solid var(--purple)", color: "#ffffff" };
const inactiveFilterStyle = { background: "var(--bg1)", border: "1px solid var(--border-sm)", color: "var(--text-secondary)" };

const PLATFORM_LABEL: Record<string, string> = {
  "": "All stores", daraz: "Daraz", cartup: "Cartup", rokomari: "Rokomari",
  pickaboo: "Pickaboo", chaldal: "Chaldal", othoba: "Othoba",
};

function href(platform: string, category: string, score: number) {
  const q = new URLSearchParams();
  if (platform) q.set("platform", platform);
  if (category) q.set("category", category);
  if (score !== 7) q.set("score", String(score));
  const qs = q.toString();
  return qs ? `/deals?${qs}` : "/deals";
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
    <div className="mx-auto px-5 max-w-6xl py-10 sm:py-14">
      {/* Header */}
      <header className="mb-8 max-w-3xl">
        <p className="dk-eyebrow mb-2">Verified price drops</p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
          Real deals today
        </h1>
        <p className="text-base sm:text-lg" style={{ color: "var(--text-muted)" }}>
          Every product here sells at or below its own 30-day average price. A deal means the price really
          dropped, not that a seller raised the &ldquo;original&rdquo; price before a sale.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-8 pb-6" style={{ borderBottom: "1px solid var(--border-sm)" }}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
          <nav aria-label="Filter by store" className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 lg:mx-0 lg:px-0 lg:pb-0 lg:flex-wrap">
            {PLATFORMS.map((p) => (
              <Link
                key={p || "all"}
                href={href(p, category, minScore)}
                aria-current={platform === p ? "page" : undefined}
                className="px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors dk-focus"
                style={platform === p ? activeFilterStyle : inactiveFilterStyle}
              >
                {PLATFORM_LABEL[p] ?? p}
              </Link>
            ))}
          </nav>

          <div role="group" aria-label="Minimum deal score" className="inline-flex p-1 rounded-xl self-start flex-shrink-0" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
            {[7, 8, 9].map((sc) => (
              <Link
                key={sc}
                href={href(platform, category, sc)}
                aria-current={minScore === sc ? "true" : undefined}
                className="px-3 py-1.5 rounded-lg text-sm font-medium tabular-nums transition-colors dk-focus"
                style={minScore === sc
                  ? { background: "var(--bg1)", color: "var(--text-primary)", boxShadow: "var(--shadow-card)" }
                  : { color: "var(--text-muted)" }}
              >
                Score {sc}+
              </Link>
            ))}
          </div>
        </div>

        <nav aria-label="Filter by category" className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 lg:mx-0 lg:px-0 lg:flex-wrap">
          {CATEGORIES.map((c) => (
            <Link
              key={c || "all"}
              href={href(platform, c, minScore)}
              aria-current={category === c ? "page" : undefined}
              className="px-3 py-1.5 rounded-lg text-sm capitalize whitespace-nowrap transition-colors dk-focus"
              style={category === c
                ? { background: "rgba(124,58,237,0.12)", color: "var(--lav)", fontWeight: 600 }
                : { color: "var(--text-muted)" }}
            >
              {c || "All categories"}
            </Link>
          ))}
        </nav>
      </div>

      {/* Deals grid + Load More */}
      {deals.length === 0 ? (
        <div className="text-center py-16 max-w-md mx-auto">
          <span className="w-14 h-14 rounded-2xl inline-flex items-center justify-center mb-5" style={{ background: "var(--bg2)", color: "var(--text-muted)" }} aria-hidden>
            <SearchX size={26} />
          </span>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No deals match these filters</h2>
          <p className="text-[0.9375rem] mb-6" style={{ color: "var(--text-muted)" }}>
            Try a lower score or another store. We only list products that are genuinely cheaper than usual.
          </p>
          <Link href="/deals" className="dk-btn-secondary dk-focus">Clear filters</Link>
        </div>
      ) : (
        <>
          <p className="text-sm mb-4 tabular-nums" style={{ color: "var(--text-muted)" }}>
            Showing {deals.length}{deals.length >= PAGE_SIZE ? "+" : ""} {deals.length === 1 ? "deal" : "deals"}
          </p>
          <DealsLoadMore initialDeals={deals} platform={platform} category={category} minScore={minScore} />
        </>
      )}
    </div>
  );
}
