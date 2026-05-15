import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(_req: NextRequest) {
  const db = createServerClient();
  const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const since6h = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [last1h, last6h, last24h, lastSnap] = await Promise.all([
    db.from('price_snapshots').select('id', { count: 'exact', head: true }).gte('scraped_at', since1h),
    db.from('price_snapshots').select('id', { count: 'exact', head: true }).gte('scraped_at', since6h),
    db.from('price_snapshots').select('id', { count: 'exact', head: true }).gte('scraped_at', since24h),
    db.from('price_snapshots').select('scraped_at').order('scraped_at', { ascending: false }).limit(1).single(),
  ]);

  const lastAt = lastSnap.data?.scraped_at ?? null;
  const status = (last6h.count ?? 0) > 0 ? 'healthy' : (last24h.count ?? 0) > 0 ? 'stale' : 'dead';

  return NextResponse.json({
    status,
    last_scrape_at: lastAt,
    snapshots_1h: last1h.count ?? 0,
    snapshots_6h: last6h.count ?? 0,
    snapshots_24h: last24h.count ?? 0,
    scrapers: [
      { platform: 'daraz', status, last_run_at: lastAt },
    ],
  }, { headers: cors() });
}
