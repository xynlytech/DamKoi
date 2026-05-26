import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase-server";

const BASE_URL = "https://damkoi.xynly.com";
const CHUNK = 50000; // Google's hard limit per sitemap file

// Render at request time, not build time (DB env isn't present during CI build).
export const dynamic = "force-dynamic";

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
  const PAGE = 1000; // Supabase caps a single query at 1000 rows

  const data: { id: string; last_scraped_at: string | null }[] = [];
  try {
    const db = createServerClient();
    for (let offset = chunkStart; offset < chunkStart + CHUNK; offset += PAGE) {
      const { data: page } = await db
        .from("products")
        .select("id, last_scraped_at")
        .eq("is_active", true)
        .not("last_scraped_at", "is", null)
        .order("id", { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (!page || page.length === 0) break;
      data.push(...(page as { id: string; last_scraped_at: string | null }[]));
      if (page.length < PAGE) break;
    }
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
