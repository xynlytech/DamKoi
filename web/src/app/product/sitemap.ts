import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase-server";

const BASE_URL = "https://damkoi.xynly.com";
const CHUNK = 50000; // Google's hard limit per sitemap file

export async function generateSitemaps() {
  const db = createServerClient();
  const { count } = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .not("last_scraped_at", "is", null);
  const chunks = Math.max(1, Math.ceil((count ?? 0) / CHUNK));
  return Array.from({ length: chunks }, (_, i) => ({ id: i }));
}

export default async function sitemap(props: {
  id: Promise<string> | string;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const start = id * CHUNK;

  const db = createServerClient();
  const { data } = await db
    .from("products")
    .select("id, last_scraped_at")
    .eq("is_active", true)
    .not("last_scraped_at", "is", null)
    .order("id", { ascending: true })
    .range(start, start + CHUNK - 1);

  return (data ?? []).map((p: { id: string; last_scraped_at: string | null }) => ({
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
