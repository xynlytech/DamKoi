import type { MetadataRoute } from "next";

const BASE_URL = "https://damkoi.xynly.com";

// Static routes only. Product URLs (200k+) live in the chunked sitemaps at
// /product/sitemap/[id].xml (see app/product/sitemap.ts), discovered via robots.txt.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE_URL, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE_URL}/deals`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/dashboard`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${BASE_URL}/install`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
