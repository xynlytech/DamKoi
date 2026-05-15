import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const cartTotal = req.nextUrl.searchParams.get('cart_total');
  const paymentMethod = req.nextUrl.searchParams.get('payment_method');
  const db = createServerClient();

  let query = db
    .from('coupons')
    .select('id, code, discount_pct, discount_flat, min_spend, payment_method, expires_at, source')
    .eq('is_active', true)
    .is('product_id', null) // platform-wide coupons only
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (cartTotal) {
    query = query.or(`min_spend.is.null,min_spend.lte.${parseInt(cartTotal, 10)}`);
  }
  if (paymentMethod) {
    query = query.or(`payment_method.is.null,payment_method.eq.${paymentMethod}`);
  }

  const { data, error } = await query.order('discount_pct', { ascending: false });

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });
  }

  // Filter to platform-relevant coupons (source contains platform name or is generic)
  const coupons = (data ?? []).filter((c: { source: string }) =>
    !c.source || c.source.includes(platform) || c.source === 'platform'
  );

  return NextResponse.json({ coupons }, { headers: cors() });
}
