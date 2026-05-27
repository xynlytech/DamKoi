import { createServerClient } from "@/lib/supabase-server";

const BASE_URL = "https://damkoi.xynly.com";
const CHUNK = 1000;

export const revalidate = 86400; // 24h

// Sitemap INDEX listing every product sitemap chunk. Submit this one URL to
// Google Search Console; it points at /product/sitemap/0.xml … N.xml.
export async function GET() {
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

  const now = new Date().toISOString();
  const entries = Array.from(
    { length: chunks },
    (_, i) =>
      `  <sitemap><loc>${BASE_URL}/product/sitemap/${i}.xml</loc><lastmod>${now}</lastmod></sitemap>`,
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
