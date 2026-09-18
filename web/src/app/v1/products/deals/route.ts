import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';
import { getVerdict } from '@/lib/verdict';

// Deals change at most once per scrape pass; let the CDN absorb repeat hits
// (home page, deals page, "show more", extension) instead of Supabase egress.
const CACHE = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

// price_history is fetched with `product_id IN (...)`; keep each request's URL short.
const ID_CHUNK = 150;

type RawProduct = {
  id: string;
  title: string;
  url: string;
  image_url: string | null;
  platform: string;
  current_price: number | null;
  first_seen_at: string | null;
  last_scraped_at: string | null;
};

function intParam(v: string | null, fallback: number, min: number, max: number) {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const minScore = intParam(searchParams.get('min_score'), 6, 0, 10);
  const limit = intParam(searchParams.get('limit'), 20, 1, 50);
  const offset = intParam(searchParams.get('offset'), 0, 0, 300);
  const platform = searchParams.get('platform') || '';
  // Category is matched as a substring of the store's category name; only
  // letters, digits, spaces and hyphens so it can't alter the filter syntax.
  const category = (searchParams.get('category') || '').replace(/[^a-zA-Z0-9 -]/g, '').trim();

  const db = createServerClient();

  // Candidates: listings whose most recent price change was a drop, newest
  // first. (Previously this took the first 200 active rows in storage order,
  // so only ~1 in 200 was an actual deal and the deals page was usually empty.)
  const candidateLimit = Math.min(600, Math.max(200, (offset + limit) * 4));
  let query = db
    .from('products')
    .select('id, title, url, image_url, platform, current_price, first_seen_at, last_scraped_at')
    .eq('is_active', true)
    .not('last_scraped_at', 'is', null)
    .lt('price_change_delta_pct', 0)
    .order('price_changed_at', { ascending: false, nullsFirst: false })
    .limit(candidateLimit);

  if (platform) query = query.eq('platform', platform);
  if (category) query = query.ilike('category', `%${category}%`);

  // A failed query must not be cached as "no deals" for an hour.
  const unavailable = () =>
    NextResponse.json({ detail: 'Deals are temporarily unavailable' }, { status: 503, headers: { ...cors(), 'Cache-Control': 'no-store' } });

  const { data: products, error } = await query;
  if (error) return unavailable();
  if (!products?.length) return NextResponse.json([], { headers: { ...cors(), 'Cache-Control': CACHE } });

  const ids = (products as RawProduct[]).map((p) => p.id);
  const histRows: { product_id: string; series: [number, number][] }[] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const { data, error: histError } = await db
      .from('price_history')
      .select('product_id, series')
      .in('product_id', ids.slice(i, i + ID_CHUNK));
    if (histError) return unavailable();
    if (data) histRows.push(...(data as typeof histRows));
  }
  const seriesById = new Map(histRows.map((h) => [h.product_id, h.series ?? []]));

  const since30dMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const deals = (products as RawProduct[])
    .map((p) => {
      const series = seriesById.get(p.id) ?? [];
      const current = p.current_price ?? 0;
      if (!current || series.length < 2) return null;

      const allPrices = series.map(([, price]) => price);
      const prices30 = series.filter(([day]) => day * 86400 * 1000 >= since30dMs).map(([, price]) => price);

      // Same observation window as the product page's verdict, so a product
      // scores identically here and on its own page.
      const first = p.first_seen_at ? new Date(p.first_seen_at).getTime() : null;
      const last = p.last_scraped_at ? new Date(p.last_scraped_at).getTime() : Date.now();
      const trackingDays = first ? Math.max(0, Math.floor((last - first) / 86400000)) : 0;

      const verdict = getVerdict(current, prices30, allPrices, null, 'en', trackingDays);
      if (verdict.deal_score < minScore || verdict.label === 'FAKE_DISCOUNT') return null;
      return {
        product: {
          id: p.id,
          title: p.title,
          platform: p.platform,
          url: p.url,
          image_url: p.image_url,
          current_price: current,
        },
        deal_score: verdict.deal_score,
        label: verdict.label,
        explanation: verdict.explanation,
        avg_30d: verdict.avg_30d,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => b.deal_score - a.deal_score)
    .slice(offset, offset + limit);

  return NextResponse.json(deals, { headers: { ...cors(), 'Cache-Control': CACHE } });
}
