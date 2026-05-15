import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') || '';
  const platform = searchParams.get('platform') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '24', 10));
  const offset = (page - 1) * limit;

  const db = createServerClient();

  let query = db
    .from('products')
    .select('id, title, url, image_url, platform, external_id, last_scraped_at', { count: 'exact' })
    .eq('is_active', true)
    .order('last_scraped_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.ilike('title', `%${search}%`);
  if (platform) query = query.eq('platform', platform);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });

  // Get latest price for each product
  const ids = (data ?? []).map((p: { id: string }) => p.id);
  const { data: snaps } = ids.length
    ? await db
        .from('price_snapshots')
        .select('product_id, price, scraped_at')
        .in('product_id', ids)
        .order('scraped_at', { ascending: false })
    : { data: [] };

  const latestPrice = new Map<string, number>();
  for (const s of snaps ?? []) {
    const snap = s as { product_id: string; price: number };
    if (!latestPrice.has(snap.product_id)) latestPrice.set(snap.product_id, snap.price);
  }

  const products = (data ?? []).map((p: { id: string; title: string; url: string; image_url: string; platform: string; external_id: string; last_scraped_at: string }) => ({
    ...p,
    current_price: latestPrice.get(p.id) ?? null,
  }));

  return NextResponse.json({ products, total: count ?? 0, page, limit }, { headers: cors() });
}
