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
  const daysParam = req.nextUrl.searchParams.get('days');
  const db = createServerClient();

  let query = db
    .from('price_snapshots')
    .select('price, scraped_at')
    .eq('product_id', id)
    .order('scraped_at', { ascending: true });

  // days=0 means "all time" — no date filter
  if (daysParam && daysParam !== '0') {
    const days = parseInt(daysParam, 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('scraped_at', since);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });
  }

  return NextResponse.json(
    { prices: (data ?? []).map((s: { price: number; scraped_at: string }) => ({ price: s.price, scraped_at: s.scraped_at })) },
    { headers: cors() },
  );
}
