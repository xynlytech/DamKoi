import type { Metadata } from "next";
import HeroSection from "./components/HeroSection";
import DealsPreview from "./components/DealsPreview";
import PlatformBadges from "./components/PlatformBadges";
import { setRequestLocale } from "next-intl/server";
import HowItWorks from "./components/HowItWorks";
import FAQSection from "./components/FAQSection";
import { SERVER_API } from "@/lib/server-api";
import { createServerClient } from "@/lib/supabase-server";
import type { HeroStats } from "./components/HeroSection";

// ISR: rebuild the home page at most every 4 hours (stats + deals).
export const revalidate = 14400;

const BASE_URL = "https://damkoi.xynly.com";

export const metadata: Metadata = {
  title: "DamKoi — Stop Falling for Fake Discounts in Bangladesh",
  description:
    "DamKoi shows you the real price history of products on Daraz, Cartup, Rokomari, and Pickaboo. Detect fake discounts, compare prices across platforms, and get alerted when prices drop.",
  alternates: {
    canonical: `${BASE_URL}/en`,
    languages: {
      en: `${BASE_URL}/en`,
      bn: `${BASE_URL}/bn`,
      "x-default": `${BASE_URL}/en`,
    },
  },
};

async function getTopDeals() {
  try {
    const res = await fetch(`${SERVER_API}/products/deals?min_score=6&limit=6`, {
      next: { revalidate: 14400 }, // ISR: revalidate every 4 hours
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// Two head-only COUNT queries: no rows leave the database, so no egress.
async function getStats(): Promise<HeroStats | null> {
  try {
    const db = createServerClient();
    const [tracked, drops] = await Promise.all([
      db.from("products").select("id", { count: "exact", head: true })
        .eq("is_active", true).not("last_scraped_at", "is", null),
      db.from("products").select("id", { count: "exact", head: true })
        .eq("is_active", true).lt("price_change_delta_pct", 0),
    ]);
    if (tracked.error || !tracked.count) return null;
    return { products: tracked.count, drops: drops.count ?? 0, stores: 6 };
  } catch {
    return null;
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [deals, stats] = await Promise.all([getTopDeals(), getStats()]);

  return (
    <div className="mx-auto px-5 max-w-6xl">
      {/* Hero — URL paste + CTA */}
      <HeroSection stats={stats} />

      {/* Platform logos strip */}
      <PlatformBadges />

      {/* Live deals feed (server-rendered) */}
      {deals.length > 0 && <DealsPreview deals={deals} />}

      {/* How DamKoi works */}
      <HowItWorks />

      {/* FAQ — question-based, citable answers for AI search (AEO/GEO) */}
      <FAQSection />
    </div>
  );
}
