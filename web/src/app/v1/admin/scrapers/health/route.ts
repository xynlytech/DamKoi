import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors, verifyAdmin } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const db = createServerClient();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const { data: products } = await db
    .from('products')
    .select('platform, last_scraped_at')
    .eq('is_active', true)
    .limit(5000);

  const byPlatform: Record<string, { total: number; lastScrape: string | null }> = {};
  for (const p of products ?? []) {
    const plat = p.platform as string;
    if (!byPlatform[plat]) byPlatform[plat] = { total: 0, lastScrape: null };
    byPlatform[plat].total++;
    if (p.last_scraped_at) {
      if (!byPlatform[plat].lastScrape || p.last_scraped_at > byPlatform[plat].lastScrape!) {
        byPlatform[plat].lastScrape = p.last_scraped_at;
      }
    }
  }

  // "Scraped today" per platform — products refreshed since midnight.
  const { data: scrapedToday } = await db
    .from('products')
    .select('platform')
    .eq('is_active', true)
    .gte('last_scraped_at', today.toISOString())
    .limit(50000);

  const snapsByPlatform: Record<string, number> = {};
  for (const s of scrapedToday ?? []) {
    const plat = (s as { platform: string }).platform;
    if (plat) snapsByPlatform[plat] = (snapsByPlatform[plat] ?? 0) + 1;
  }

  const result = Object.entries(byPlatform).map(([platform, { total, lastScrape }]) => {
    const hoursAgo = lastScrape
      ? Math.floor((Date.now() - new Date(lastScrape).getTime()) / (60 * 60 * 1000))
      : null;
    const status = hoursAgo == null ? 'unknown' : hoursAgo < 7 ? 'healthy' : hoursAgo < 25 ? 'stale' : 'dead';
    return {
      platform,
      status,
      total_products: total,
      recently_scraped_6h: 0,
      snaps_today: snapsByPlatform[platform] ?? 0,
      hours_since_last_scrape: hoursAgo,
    };
  });

  return NextResponse.json(result, { headers: cors() });
}
