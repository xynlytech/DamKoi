import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';
import { getVerdict } from '@/lib/verdict';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const minScore = parseInt(searchParams.get('min_score') ?? '6', 10);
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10));
  const platform = searchParams.get('platform') || '';

  const db = createServerClient();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let query = db
    .from('products')
    .select('id, title, url, image_url, platform')
    .eq('is_active', true)
    .not('last_scraped_at', 'is', null);

  if (platform) query = query.eq('platform', platform);

  const { data: products } = await query.limit(200);
  if (!products?.length) return NextResponse.json([], { headers: cors() });

  const ids = products.map((p: { id: string }) => p.id);

  const [{ data: snaps30 }, { data: snapsAll }] = await Promise.all([
    db.from('price_snapshots').select('product_id, price').in('product_id', ids).gte('scraped_at', since30d),
    db.from('price_snapshots').select('product_id, price, scraped_at').in('product_id', ids).order('scraped_at', { ascending: false }),
  ]);

  const snap30Map = new Map<string, number[]>();
  const snapAllMap = new Map<string, number[]>();
  const latestMap  = new Map<string, number>();

  for (const s of snaps30 ?? []) {
    const snap = s as { product_id: string; price: number };
    if (!snap30Map.has(snap.product_id)) snap30Map.set(snap.product_id, []);
    snap30Map.get(snap.product_id)!.push(snap.price);
  }
  for (const s of snapsAll ?? []) {
    const snap = s as { product_id: string; price: number; scraped_at: string };
    if (!snapAllMap.has(snap.product_id)) snapAllMap.set(snap.product_id, []);
    snapAllMap.get(snap.product_id)!.push(snap.price);
    if (!latestMap.has(snap.product_id)) latestMap.set(snap.product_id, snap.price);
  }

  type RawProduct = { id: string; title: string; url: string; image_url: string | null; platform: string };

  const deals = (products as RawProduct[])
    .map((p) => {
      const prices30  = snap30Map.get(p.id) ?? [];
      const allPrices = snapAllMap.get(p.id) ?? [];
      const current   = latestMap.get(p.id) ?? 0;
      if (!current || allPrices.length < 2) return null;
      const verdict = getVerdict(current, prices30, allPrices);
      if (verdict.deal_score < minScore) return null;
      return {
        product: {
          id:            p.id,
          title:         p.title,
          platform:      p.platform,
          url:           p.url,
          image_url:     p.image_url,
          current_price: current,
        },
        deal_score:  verdict.deal_score,
        label:       verdict.label,
        explanation: verdict.explanation,
        avg_30d:     verdict.avg_30d,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => b.deal_score - a.deal_score)
    .slice(0, limit);

  return NextResponse.json(deals, { headers: cors() });
}
