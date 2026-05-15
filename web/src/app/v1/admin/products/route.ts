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
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10));
  const offset = (page - 1) * limit;

  const db = createServerClient();
  let query = db
    .from('products')
    .select('id, title, url, platform, external_id, is_active, last_scraped_at, first_seen_at, image_url', { count: 'exact' })
    .order('last_scraped_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.ilike('title', `%${search}%`);
  if (platform) query = query.eq('platform', platform);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });

  return NextResponse.json({ products: data ?? [], total: count ?? 0, page, limit }, { headers: cors() });
}
