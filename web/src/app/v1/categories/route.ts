import { NextRequest, NextResponse } from "next/server";
import { createServerClient, cors } from "@/lib/supabase-server";
import { categorySlug } from "@/lib/slug";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

// Category list with product counts (via the category_counts SQL function),
// gated by a minimum count so we never expose thin hubs. Powers the category
// hub pages and the categories index.
export async function GET(req: NextRequest) {
  const min = Math.max(1, parseInt(req.nextUrl.searchParams.get("min") ?? "12", 10));
  const db = createServerClient();

  const { data, error } = await db.rpc("category_counts", { min_count: min });
  if (error) return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });

  const categories = (data ?? []).map((r: { category: string; n: number }) => ({
    name: r.category,
    slug: categorySlug(r.category),
    count: Number(r.n),
  }));

  return NextResponse.json(
    { categories, total: categories.length },
    {
      headers: {
        ...cors(),
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    },
  );
}
