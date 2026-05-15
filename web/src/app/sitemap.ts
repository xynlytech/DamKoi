import type { MetadataRoute } from "next";

const BASE_URL = "https://damkoi.xynly.com";
const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

async function getAllProductIds(): Promise<string[]> {
  try {
    // Paginate to get up to 5,000 product IDs for sitemap
    const res = await fetch(`${API}/products/?limit=100`, {
      next: { revalidate: 86400 }, // 24h
    });
    if (!res.ok) return [];
    const products: Array<{ id: string }> = await res.json();
    return products.map((p) => p.id);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productIds = await getAllProductIds();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: `${BASE_URL}/deals`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/dashboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    { url: `${BASE_URL}/install`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const productRoutes: MetadataRoute.Sitemap = productIds.map((id) => ({
    url: `${BASE_URL}/product/${id}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
