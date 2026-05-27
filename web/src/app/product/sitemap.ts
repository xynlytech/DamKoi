import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase-server";

const BASE_URL = "https://damkoi.xynly.com";
const CHUNK = 50000; // Google's hard limit per sitemap file
const PAGE = 1000;   // Supabase caps a single query at 1000 rows

// Cache each generated sitemap for 24h (ISR). Regenerates daily in the
// background; Googlebot is always served the fast cached copy.
export const revalidate = 86400;
export const maxDuration = 60;

export async function generateSitemaps() {
  try {
    const db = createServerClient();
    const { count } = await db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .not("last_scraped_at", "is", null);
    const chunks = Math.max(1, Math.ceil((count ?? 0) / CHUNK));
    return Array.from({ length: chunks }, (_, i) => ({ id: i }));
  } catch {
    return [{ id: 0 }];
  }
}

export default async function sitemap(props: {
  id: Promise<string> | string;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const chunkStart = id * CHUNK;

  let data: { id: string; last_scraped_at: string | null }[] = [];
  try {
    const db = createServerClient();
    // Fetch all 50 pages of this chunk in parallel (sequential was ~40s → timeout).
    const offsets: number[] = [];
    for (let o = chunkStart; o < chunkStart + CHUNK; o += PAGE) offsets.push(o);
    const pages = await Promise.all(
      offsets.map((o) =>
        db
          .from("products")
          .select("id, last_scraped_at")
          .eq("is_active", true)
          .not("last_scraped_at", "is", null)
          .order("id", { ascending: true })
          .range(o, o + PAGE - 1)
          .then((r) => r.data ?? []),
      ),
    );
    data = pages.flat() as { id: string; last_scraped_at: string | null }[];
  } catch {
    return [];
  }

  return data.map((p: { id: string; last_scraped_at: string | null }) => ({
    url: `${BASE_URL}/en/product/${p.id}`,
    lastModified: p.last_scraped_at ? new Date(p.last_scraped_at) : new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
    alternates: {
      languages: {
        en: `${BASE_URL}/en/product/${p.id}`,
        bn: `${BASE_URL}/bn/product/${p.id}`,
      },
    },
  }));
}
