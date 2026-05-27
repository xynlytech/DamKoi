import type { Metadata } from "next";
import HeroSection from "./components/HeroSection";
import DealsPreview from "./components/DealsPreview";
import PlatformBadges from "./components/PlatformBadges";
import HowItWorks from "./components/HowItWorks";
import FAQSection from "./components/FAQSection";

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

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

async function getTopDeals() {
  try {
    const res = await fetch(`${API}/products/deals?min_score=6&limit=6`, {
      next: { revalidate: 3600 }, // ISR: revalidate every hour
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const deals = await getTopDeals();

  return (
    <div className="container mx-auto px-4">
      {/* Hero — URL paste + CTA */}
      <HeroSection />

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
