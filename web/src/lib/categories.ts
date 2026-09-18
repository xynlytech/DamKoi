import { createServerClient } from "@/lib/supabase-server";
import { categorySlug } from "@/lib/slug";

export type Category = { name: string; slug: string; count: number };

// Query the category_counts RPC directly (no self-HTTP hop) so build-time
// rendering — categories index, sitemap, hub generateStaticParams — works
// reliably. Mirrors how product/sitemap.ts reads Supabase directly.
export async function fetchCategories(min = 12): Promise<Category[]> {
  try {
    const db = createServerClient();
    const { data, error } = await db.rpc("category_counts", { min_count: min });
    if (error || !data) return [];
    // Store categories sometimes differ only by case or "&"/"and"
    // ("Hair Accessories" / "Hair accessories"); they share a slug, so merge
    // them: one chip, one URL, summed count, the most common spelling wins.
    const bySlug = new Map<string, Category & { top: number }>();
    for (const r of data as { category: string; n: number }[]) {
      const slug = categorySlug(r.category);
      const n = Number(r.n);
      const prev = bySlug.get(slug);
      if (!prev) bySlug.set(slug, { name: r.category, slug, count: n, top: n });
      else {
        prev.count += n;
        if (n > prev.top) { prev.name = r.category; prev.top = n; }
      }
    }
    return [...bySlug.values()]
      .sort((a, b) => b.count - a.count)
      .map(({ name, slug, count }) => ({ name, slug, count }));
  } catch {
    return [];
  }
}
