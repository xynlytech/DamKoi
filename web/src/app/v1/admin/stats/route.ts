import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(_req: NextRequest) {
  const db = createServerClient();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [products, users, alerts, coupons, snapsToday] = await Promise.all([
    db.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    db.from('users').select('id', { count: 'exact', head: true }),
    db.from('alerts').select('id', { count: 'exact', head: true }).eq('is_active', true),
    db.from('coupons').select('id', { count: 'exact', head: true }).eq('is_active', true),
    db.from('price_snapshots').select('id', { count: 'exact', head: true }).gte('scraped_at', today.toISOString()),
  ]);

  return NextResponse.json({
    total_products: products.count ?? 0,
    total_users: users.count ?? 0,
    active_alerts: alerts.count ?? 0,
    active_coupons: coupons.count ?? 0,
    snapshots_today: snapsToday.count ?? 0,
  }, { headers: cors() });
}
