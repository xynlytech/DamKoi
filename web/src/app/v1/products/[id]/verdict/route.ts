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
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: snaps30 }, { data: snapsAll }] = await Promise.all([
    db.from('price_snapshots').select('price, scraped_at').eq('product_id', id).gte('scraped_at', since30d).order('scraped_at', { ascending: false }),
    db.from('price_snapshots').select('price, scraped_at').eq('product_id', id).order('scraped_at', { ascending: false }).limit(500),
  ]);

  const prices30 = (snaps30 ?? []).map((s: { price: number }) => s.price);
  const allPrices = (snapsAll ?? []).map((s: { price: number }) => s.price);
  const current = allPrices[0] ?? 0;

  if (!current) return NextResponse.json({ detail: 'No price data yet' }, { status: 404, headers: cors() });

  const minPrice = Math.min(...allPrices);
  const atlSnap = (snapsAll ?? []).find((s: { price: number }) => s.price === minPrice) as { scraped_at: string } | undefined;
  const atlDate = atlSnap?.scraped_at.slice(0, 10) ?? null;

  return NextResponse.json(getVerdict(current, prices30, allPrices, atlDate), { headers: cors() });
}
