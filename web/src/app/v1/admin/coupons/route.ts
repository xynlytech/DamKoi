import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const platform = searchParams.get('platform') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10));
  const offset = (page - 1) * limit;

  const db = createServerClient();
  let query = db
    .from('coupons')
    .select('id, code, discount_pct, discount_flat, min_spend, payment_method, expires_at, is_active, source, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (platform) query = query.ilike('source', `%${platform}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });
  return NextResponse.json({ coupons: data ?? [], total: count ?? 0, page, limit }, { headers: cors() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.code) return NextResponse.json({ detail: 'code required' }, { status: 400, headers: cors() });
  const db = createServerClient();
  const { data, error } = await db.from('coupons').insert({ ...body, created_at: new Date().toISOString() }).select('id').single();
  if (error) return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });
  return NextResponse.json({ id: data.id }, { status: 201, headers: cors() });
}
