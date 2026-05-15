import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const days = parseInt(req.nextUrl.searchParams.get('days') ?? '90', 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const db = createServerClient();
  const { data, error } = await db
    .from('price_snapshots')
    .select('price, scraped_at')
    .eq('product_id', id)
    .gte('scraped_at', since)
    .order('scraped_at', { ascending: true });

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });
  }

  return NextResponse.json(
    { prices: (data ?? []).map((s: { price: number; scraped_at: string }) => ({ price: s.price, date: s.scraped_at })) },
    { headers: cors() },
  );
}
