import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';
import { getVerdict } from '@/lib/verdict';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = createServerClient();
  const since30dMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const [{ data: prod }, { data: hist }] = await Promise.all([
    db
      .from('products')
      .select('current_price, first_seen_at, last_scraped_at')
      .eq('id', id)
      .single(),
    db.from('price_history').select('series').eq('product_id', id).single(),
  ]);

  const series: [number, number][] = (hist?.series as [number, number][]) ?? [];
  const pts = series.map(([day, price]) => ({ price, ms: day * 86400 * 1000 }));
  const current = (prod?.current_price as number) ?? pts[pts.length - 1]?.price ?? 0;

  // No price at all (never successfully scraped) → genuinely nothing to show.
  if (!current && !pts.length) {
    return NextResponse.json({ detail: 'No price data yet' }, { status: 404, headers: cors() });
  }

  const allPrices = pts.length ? pts.map((p) => p.price) : [current];
  const prices30 = pts.filter((p) => p.ms >= since30dMs).map((p) => p.price);

  // Observation window — how long we've actually been watching this listing.
  const first = prod?.first_seen_at ? new Date(prod.first_seen_at as string).getTime() : null;
  const last = prod?.last_scraped_at
    ? new Date(prod.last_scraped_at as string).getTime()
    : Date.now();
  const trackingDays = first ? Math.max(0, Math.floor((last - first) / 86400000)) : 0;

  const minPrice = Math.min(...allPrices);
  const atl = pts.find((p) => p.price === minPrice);
  const atlDate = atl ? new Date(atl.ms).toISOString().slice(0, 10) : null;

  return NextResponse.json(
    getVerdict(current, prices30, allPrices, atlDate, 'en', trackingDays),
    { headers: cors() },
  );
}
