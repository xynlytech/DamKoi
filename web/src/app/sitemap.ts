import type { MetadataRoute } from "next";
import { fetchCategories } from "@/lib/categories";

const BASE_URL = "https://damkoi.xynly.com";

// Static routes + category hubs. Product URLs (200k+) live in the chunked
// sitemaps at /product/sitemap/[id].xml (see app/product/sitemap.ts).
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE_URL}/deals`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/en/categories`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/install`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/dashboard`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const categories = await fetchCategories(20);
  for (const c of categories) {
    base.push({
      url: `${BASE_URL}/en/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  return base;
}
