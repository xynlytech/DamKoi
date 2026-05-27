import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase-server";

const BASE_URL = "https://damkoi.xynly.com";
// 1 000 URLs/sitemap = a single Supabase query (it caps results at 1 000 rows),
// so each chunk renders in ~1s instead of timing out. Google allows tens of
// thousands of sitemaps in an index, so the extra files are fine.
const CHUNK = 1000;

export const revalidate = 86400; // cache each chunk 24h (ISR)

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
  const start = id * CHUNK;

  let data: { id: string; last_scraped_at: string | null }[] = [];
  try {
    const db = createServerClient();
    const { data: rows } = await db
      .from("products")
      .select("id, last_scraped_at")
      .eq("is_active", true)
      .not("last_scraped_at", "is", null)
      .order("id", { ascending: true })
      .range(start, start + CHUNK - 1);
    data = (rows ?? []) as { id: string; last_scraped_at: string | null }[];
  } catch {
    return [];
  }

  return data.map((p) => ({
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
