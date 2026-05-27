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
    return (data as { category: string; n: number }[]).map((r) => ({
      name: r.category,
      slug: categorySlug(r.category),
      count: Number(r.n),
    }));
  } catch {
    return [];
  }
}
