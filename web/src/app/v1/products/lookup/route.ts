import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';
import { detectPlatformAndId } from '@/lib/platform';
import { getVerdict } from '@/lib/verdict';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ detail: 'url query param required' }, { status: 400, headers: cors() });
  }

  const { platform, externalId } = detectPlatformAndId(url);
  if (!platform || !externalId) {
    return NextResponse.json(
      { detail: 'Unsupported URL. Paste a product page URL from Daraz, Cartup, Rokomari, Pickaboo, Chaldal, or Othoba.' },
      { status: 400, headers: cors() },
    );
  }

  const db = createServerClient();

  // Find product
  const { data: product, error: pErr } = await db
    .from('products')
    .select('id, title, url, image_url, platform, external_id, last_scraped_at, current_price')
    .eq('platform', platform)
    .eq('external_id', externalId)
    .single();

  if (pErr || !product) {
    return NextResponse.json(
      { detail: 'Product not yet tracked. Check back in 15–30 minutes after visiting the page.' },
      { status: 404, headers: cors() },
    );
  }

  // Price history series → [[epoch_day, price], ...]
  const since30dMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const { data: hist } = await db
    .from('price_history')
    .select('series')
    .eq('product_id', product.id)
    .single();
  const series: [number, number][] = (hist?.series as [number, number][]) ?? [];
  const allPrices = series.map(([, price]) => price);
  const prices30d = series.filter(([day]) => day * 86400 * 1000 >= since30dMs).map(([, price]) => price);
  const latestPrice = (product.current_price as number) ?? (allPrices[allPrices.length - 1] ?? 0);

  const minPrice = allPrices.length ? Math.min(...allPrices) : null;
  const atlPt = minPrice != null ? series.find(([, price]) => price === minPrice) : null;
  const atlDate = atlPt ? new Date(atlPt[0] * 86400 * 1000).toISOString().slice(0, 10) : null;

  const verdict = getVerdict(latestPrice, prices30d, allPrices, atlDate);

  return NextResponse.json(
    {
      product: {
        id: product.id,
        title: product.title,
        url: product.url,
        image_url: product.image_url,
        platform: product.platform,
        current_price: latestPrice,
        last_scraped_at: product.last_scraped_at,
      },
      verdict,
    },
    { headers: cors() },
  );
}
