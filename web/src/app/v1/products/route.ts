import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') || '';
  const platform = searchParams.get('platform') || '';
  const category = searchParams.get('category') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '24', 10));
  const offset = (page - 1) * limit;

  const db = createServerClient();

  let query = db
    .from('products')
    .select('id, title, url, image_url, platform, external_id, last_scraped_at, current_price, current_original_price, current_discount_pct, current_in_stock', { count: 'exact' })
    .eq('is_active', true)
    .not('last_scraped_at', 'is', null)   // hide un-enriched stubs
    .order('last_scraped_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.ilike('title', `%${search}%`);
  if (platform) query = query.eq('platform', platform);
  if (category) query = query.eq('category', category);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });

  const products = (data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id, title: p.title, url: p.url, image_url: p.image_url,
    platform: p.platform, external_id: p.external_id, last_scraped_at: p.last_scraped_at,
    current_price: p.current_price ?? null,
    original_price: p.current_original_price ?? null,
    discount_pct: p.current_discount_pct ?? null,
    in_stock: p.current_in_stock ?? null,
  }));

  return NextResponse.json({ products, total: count ?? 0, page, limit }, { headers: cors() });
}
