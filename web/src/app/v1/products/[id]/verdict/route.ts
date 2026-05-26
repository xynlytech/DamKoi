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
    db.from('products').select('current_price').eq('id', id).single(),
    db.from('price_history').select('series').eq('product_id', id).single(),
  ]);

  const series: [number, number][] = (hist?.series as [number, number][]) ?? [];
  if (!series.length) return NextResponse.json({ detail: 'No price data yet' }, { status: 404, headers: cors() });

  const pts = series.map(([day, price]) => ({ price, ms: day * 86400 * 1000 }));
  const allPrices = pts.map((p) => p.price);
  const prices30 = pts.filter((p) => p.ms >= since30dMs).map((p) => p.price);
  const current = (prod?.current_price as number) ?? allPrices[allPrices.length - 1] ?? 0;

  if (!current) return NextResponse.json({ detail: 'No price data yet' }, { status: 404, headers: cors() });

  const minPrice = Math.min(...allPrices);
  const atl = pts.find((p) => p.price === minPrice);
  const atlDate = atl ? new Date(atl.ms).toISOString().slice(0, 10) : null;

  return NextResponse.json(getVerdict(current, prices30, allPrices, atlDate), { headers: cors() });
}
