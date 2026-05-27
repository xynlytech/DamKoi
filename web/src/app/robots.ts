import type { MetadataRoute } from "next";

const BASE_URL = "https://damkoi.xynly.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/_next/", "/admin"] },
    ],
    // Static routes + the product sitemap index (which lists all chunks).
    sitemap: [`${BASE_URL}/sitemap.xml`, `${BASE_URL}/sitemap-products.xml`],
  };
}
