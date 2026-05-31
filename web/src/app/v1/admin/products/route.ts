import { NextRequest, NextResponse } from "next/server";
import { createServerClient, cors, verifyAdmin } from "@/lib/supabase-server";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

function parseIntParam(value: string | null, fallback: number) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseBoolParam(value: string | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const platform = searchParams.get("platform") || "";
  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const hasPriceChange = parseBoolParam(searchParams.get("has_price_change"));
  const changedSince = searchParams.get("changed_since") || "";
  const direction = searchParams.get("direction") || "";
  const isActive = parseBoolParam(searchParams.get("is_active"));
  const inStock = parseBoolParam(searchParams.get("in_stock"));
  const hasErrors = parseBoolParam(searchParams.get("has_errors"));
  const sort = searchParams.get("sort") || "";
  const sortDir = (searchParams.get("sort_dir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseIntParam(searchParams.get("page"), 1));
  const limit = Math.min(100, parseIntParam(searchParams.get("limit"), 20));
  const offset = (page - 1) * limit;

  const priceMin = searchParams.get("price_min");
  const priceMax = searchParams.get("price_max");
  const deltaMin = searchParams.get("delta_min");
  const deltaMax = searchParams.get("delta_max");
  const discountMin = searchParams.get("discount_min");
  const staleDays = searchParams.get("stale_days");
  const minDataPoints = searchParams.get("min_data_points");

  const db = createServerClient();

  let eligibleIds: string[] | null = null;
  if (minDataPoints) {
    const minPoints = Math.max(1, parseIntParam(minDataPoints, 1));
    const { data: historyRows, error: historyError } = await db
      .from("price_history")
      .select("product_id")
      .gte("point_count", minPoints);
    if (historyError) {
      return NextResponse.json({ detail: historyError.message }, { status: 500, headers: cors() });
    }
    eligibleIds = (historyRows ?? []).map((row: { product_id: string }) => row.product_id);
    if (eligibleIds.length === 0) {
      return NextResponse.json({ products: [], total: 0, page, limit }, { headers: cors() });
    }
  }

  const sortMap: Record<string, string> = {
    price_changed_at: "price_changed_at",
    current_price: "current_price",
    price_change_delta_pct: "price_change_delta_pct",
    last_scraped_at: "last_scraped_at",
  };
  const sortColumn = sortMap[sort] || (hasPriceChange || direction || changedSince ? "price_changed_at" : "last_scraped_at");

  let query = db
    .from("products")
    .select(
      `
      id, title, url, platform, external_id, is_active, last_scraped_at, first_seen_at, image_url,
      current_price, current_original_price, current_discount_pct, current_in_stock,
      previous_price, price_changed_at, price_change_delta_pct,
      category, brand, consecutive_misses, out_of_stock_since, last_backfilled_at
    `,
      { count: "exact" },
    );

  if (eligibleIds) query = query.in("id", eligibleIds);
  if (search) query = query.ilike("title", `%${search}%`);
  if (platform) query = query.eq("platform", platform);
  if (category) query = query.ilike("category", `%${category}%`);
  if (brand) query = query.ilike("brand", `%${brand}%`);
  if (hasPriceChange === true) query = query.not("price_changed_at", "is", null);
  if (hasPriceChange === false) query = query.is("price_changed_at", null);
  if (changedSince) query = query.gte("price_changed_at", changedSince);
  if (direction === "up") query = query.gt("price_change_delta_pct", 0);
  if (direction === "down") query = query.lt("price_change_delta_pct", 0);
  if (isActive !== null) query = query.eq("is_active", isActive);
  if (inStock !== null) query = query.eq("current_in_stock", inStock);
  if (hasErrors === true) query = query.gt("consecutive_misses", 0);
  if (hasErrors === false) query = query.eq("consecutive_misses", 0);
  if (priceMin) query = query.gte("current_price", parseIntParam(priceMin, 0));
  if (priceMax) query = query.lte("current_price", parseIntParam(priceMax, 0));
  if (deltaMin) query = query.gte("price_change_delta_pct", parseIntParam(deltaMin, 0));
  if (deltaMax) query = query.lte("price_change_delta_pct", parseIntParam(deltaMax, 0));
  if (discountMin) query = query.gte("current_discount_pct", parseIntParam(discountMin, 0));
  if (staleDays) {
    const days = Math.max(1, parseIntParam(staleDays, 1));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.lt("last_scraped_at", cutoff);
  }

  query = query.order(sortColumn, { ascending: sortDir === "asc", nullsFirst: false });
  if (sortColumn !== "last_scraped_at") {
    query = query.order("last_scraped_at", {
      ascending: false,
      nullsFirst: false,
    });
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });

  const pageProducts = data ?? [];
  const productIds = pageProducts.map((p: Record<string, unknown>) => String(p.id));
  const { data: historyCounts, error: countsError } = productIds.length
    ? await db.from("price_history").select("product_id, point_count").in("product_id", productIds)
    : { data: [], error: null };
  if (countsError) {
    return NextResponse.json({ detail: countsError.message }, { status: 500, headers: cors() });
  }
  const pointCountById = new Map<string, number>(
    (historyCounts ?? []).map((row: { product_id: string; point_count: number }) => [row.product_id, row.point_count]),
  );

  const products = pageProducts.map((p: Record<string, unknown>) => {
    const id = String(p.id);
    return {
      id,
      title: p.title,
      url: p.url,
      platform: p.platform,
      external_id: p.external_id,
      is_active: p.is_active,
      last_scraped_at: p.last_scraped_at,
      first_seen_at: p.first_seen_at,
      image_url: p.image_url,
      current_price: p.current_price ?? null,
      current_original_price: p.current_original_price ?? null,
      current_discount_pct: p.current_discount_pct ?? null,
      in_stock: p.current_in_stock ?? null,
      previous_price: p.previous_price ?? null,
      price_changed_at: p.price_changed_at ?? null,
      price_change_delta_pct: p.price_change_delta_pct ?? null,
      category: p.category ?? null,
      brand: p.brand ?? null,
      consecutive_misses: p.consecutive_misses ?? 0,
      out_of_stock_since: p.out_of_stock_since ?? null,
      last_backfilled_at: p.last_backfilled_at ?? null,
      price_history_points: pointCountById.get(id) ?? null,
    };
  });

  return NextResponse.json({ products, total: count ?? 0, page, limit }, { headers: cors() });
}
