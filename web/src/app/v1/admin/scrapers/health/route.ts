import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors, verifyAdmin } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

// Platforms we track (mirrors ENABLED_PLATFORMS and the dashboard colour map).
const PLATFORMS = ['daraz', 'rokomari', 'pickaboo', 'cartup', 'chaldal', 'othoba'];

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const db = createServerClient();
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const perPlatform = await Promise.all(PLATFORMS.map(async (platform) => {
    // head:true + count:'exact' returns ONLY a row count (in the Content-Range
    // header), so these are immune to PostgREST's default 1000-row ceiling that
    // capped the old row-fetch approach (which made a 200k-row catalog read as
    // exactly "1,000" total / "1,000" snaps today).
    const activeCount = () =>
      db.from('products').select('*', { count: 'exact', head: true })
        .eq('platform', platform).eq('is_active', true);

    const [totalRes, snapsRes, sixhRes, lastRes] = await Promise.all([
      activeCount(),
      activeCount().gte('last_scraped_at', midnight.toISOString()),
      activeCount().gte('last_scraped_at', sixHoursAgo.toISOString()),
      db.from('products')
        .select('last_scraped_at')
        .eq('platform', platform).eq('is_active', true)
        .not('last_scraped_at', 'is', null)
        .order('last_scraped_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const total = totalRes.count ?? 0;
    if (total === 0) return null;  // platform has no products — omit from dashboard

    const lastScrape =
      (lastRes.data as { last_scraped_at: string } | null)?.last_scraped_at ?? null;
    const hoursAgo = lastScrape
      ? Math.floor((Date.now() - new Date(lastScrape).getTime()) / 3_600_000)
      : null;
    const status =
      hoursAgo == null ? 'unknown' : hoursAgo < 7 ? 'healthy' : hoursAgo < 25 ? 'stale' : 'dead';

    return {
      platform,
      status,
      total_products: total,
      recently_scraped_6h: sixhRes.count ?? 0,
      snaps_today: snapsRes.count ?? 0,
      last_scraped_at: lastScrape,
      hours_since_last_scrape: hoursAgo,
    };
  }));

  return NextResponse.json(perPlatform.filter(Boolean), { headers: cors() });
}
