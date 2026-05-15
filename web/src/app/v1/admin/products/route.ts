import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors, verifyAdmin } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') || '';
  const platform = searchParams.get('platform') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10));
  const offset = (page - 1) * limit;

  const db = createServerClient();
  let query = db
    .from('products')
    .select(`
      id, title, url, platform, external_id, is_active, last_scraped_at, first_seen_at, image_url,
      price_snapshots ( price, in_stock, scraped_at )
    `, { count: 'exact' })
    .order('last_scraped_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.ilike('title', `%${search}%`);
  if (platform) query = query.eq('platform', platform);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });

  const products = (data ?? []).map((p: Record<string, unknown>) => {
    const snaps = p.price_snapshots as { price: number; in_stock: boolean; scraped_at: string }[] | null;
    const latest = Array.isArray(snaps) && snaps.length
      ? snaps.sort((a, b) => new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime())[0]
      : null;
    return {
      id: p.id, title: p.title, url: p.url, platform: p.platform,
      external_id: p.external_id, is_active: p.is_active,
      last_scraped_at: p.last_scraped_at, first_seen_at: p.first_seen_at,
      image_url: p.image_url,
      current_price: latest?.price ?? null,
      in_stock: latest?.in_stock ?? null,
    };
  });

  return NextResponse.json({ products, total: count ?? 0, page, limit }, { headers: cors() });
}
