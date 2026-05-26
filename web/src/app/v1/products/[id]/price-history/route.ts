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

  const { data, error } = await db
    .from('price_history')
    .select('series')
    .eq('product_id', id)
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });
  }

  // series = [[epoch_day, price], ...] → expand to {price, scraped_at}
  const series: [number, number][] = (data?.series as [number, number][]) ?? [];
  let points = series.map(([day, price]) => ({
    price,
    scraped_at: new Date(day * 86400 * 1000).toISOString(),
  }));

  // days=0 means "all time" — no date filter
  if (daysParam && daysParam !== '0') {
    const days = parseInt(daysParam, 10);
    const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
    points = points.filter((p) => new Date(p.scraped_at).getTime() >= sinceMs);
  }

  return NextResponse.json({ prices: points }, { headers: cors() });
}
