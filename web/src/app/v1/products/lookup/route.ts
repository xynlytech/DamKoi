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
    .select('id, title, url, image_url, platform, external_id, last_scraped_at')
    .eq('platform', platform)
    .eq('external_id', externalId)
    .single();

  if (pErr || !product) {
    return NextResponse.json(
      { detail: 'Product not yet tracked. Check back in 15–30 minutes after visiting the page.' },
      { status: 404, headers: cors() },
    );
  }

  // Fetch price snapshots
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: snaps30 }, { data: snapsAll }] = await Promise.all([
    db
      .from('price_snapshots')
      .select('price, scraped_at')
      .eq('product_id', product.id)
      .gte('scraped_at', since30d)
      .order('scraped_at', { ascending: false }),
    db
      .from('price_snapshots')
      .select('price, scraped_at')
      .eq('product_id', product.id)
      .order('scraped_at', { ascending: false })
      .limit(500),
  ]);

  const prices30d = (snaps30 ?? []).map((s: { price: number }) => s.price);
  const allPrices = (snapsAll ?? []).map((s: { price: number }) => s.price);
  const latestPrice = allPrices[0] ?? 0;

  // Find all-time low date
  const minPrice = allPrices.length ? Math.min(...allPrices) : null;
  const atlSnap = minPrice != null
    ? (snapsAll ?? []).find((s: { price: number }) => s.price === minPrice)
    : null;
  const atlDate = atlSnap ? (atlSnap as { scraped_at: string }).scraped_at.slice(0, 10) : null;

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
