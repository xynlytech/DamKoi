import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';
import { getVerdict } from '@/lib/verdict';

// Deals change at most once per scrape pass; let the CDN absorb repeat hits
// (home page, deals page, "show more", extension) instead of Supabase egress.
const CACHE = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
// Netlify's Next.js runtime keys the CDN cache on `_rsc`/`__nextDataReq` only,
// so without this every filter combination was served the first cached list.
const CACHE_HEADERS = { 'Cache-Control': CACHE, 'Netlify-Vary': 'query' };

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
  const offset = intParam(searchParams.get('offset'), 0, 0, 20000);
  const platform = searchParams.get('platform') || '';
  // Category is matched as a substring of the store's category name; only
  // letters, digits, spaces and hyphens so it can't alter the filter syntax.
  const category = (searchParams.get('category') || '').replace(/[^a-zA-Z0-9 -]/g, '').trim();

  const db = createServerClient();

  // deal_scores (materialized view, refreshed by the scraper after every pass)
  // scores every product whose latest price change was a drop with the same
  // rules as getVerdict, so paging reaches all deals, not just recent drops.
  let query = db
    .from('deal_scores')
    .select('product_id')
    .gte('deal_score', minScore)
    .neq('label', 'FAKE_DISCOUNT')
    .order('deal_score', { ascending: false })
    .order('price_changed_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (platform) query = query.eq('platform', platform);
  if (category) query = query.ilike('category', `%${category}%`);

  // A failed query must not be cached as "no deals" for an hour.
  const unavailable = () =>
    NextResponse.json({ detail: 'Deals are temporarily unavailable' }, { status: 503, headers: { ...cors(), 'Cache-Control': 'no-store' } });

  const { data: ranked, error } = await query;
  if (error) return unavailable();
  if (!ranked?.length) return NextResponse.json([], { headers: { ...cors(), ...CACHE_HEADERS } });

  const ids = (ranked as { product_id: string }[]).map((r) => r.product_id);
  const [{ data: productRows, error: prodError }, { data: histRows, error: histError }] = await Promise.all([
    db
      .from('products')
      .select('id, title, url, image_url, platform, current_price, first_seen_at, last_scraped_at')
      .in('id', ids),
    db.from('price_history').select('product_id, series').in('product_id', ids),
  ]);
  if (prodError || histError) return unavailable();

  const productById = new Map((productRows as RawProduct[]).map((p) => [p.id, p]));
  const seriesById = new Map(
    ((histRows ?? []) as { product_id: string; series: [number, number][] }[]).map((h) => [h.product_id, h.series ?? []]),
  );
  // Keep the view's ranking; the view may be up to one scrape pass old.
  const products = ids.map((id) => productById.get(id)).filter((p): p is RawProduct => p !== undefined);

  const since30dMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const deals = products
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
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return NextResponse.json(deals, { headers: { ...cors(), ...CACHE_HEADERS } });
}
