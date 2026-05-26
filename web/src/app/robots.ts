import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase-server";

const BASE_URL = "https://damkoi.xynly.com";
const CHUNK = 50000;

// Evaluate at request time so the chunk count reflects live product totals.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Discover how many product sitemap chunks exist so Google can crawl them all.
  let chunks = 1;
  try {
    const db = createServerClient();
    const { count } = await db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .not("last_scraped_at", "is", null);
    chunks = Math.max(1, Math.ceil((count ?? 0) / CHUNK));
  } catch {
    chunks = 1;
  }

  const sitemap = [
    `${BASE_URL}/sitemap.xml`,
    ...Array.from({ length: chunks }, (_, i) => `${BASE_URL}/product/sitemap/${i}.xml`),
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/_next/", "/admin"] },
    ],
    sitemap,
  };
}
