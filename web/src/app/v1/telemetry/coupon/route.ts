import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400, headers: cors() });
  }

  const db = createServerClient();
  await db.from('coupon_applications').insert({
    coupon_id: body.coupon_id ?? null,
    product_id: body.product_id ?? null,
    platform: body.platform ?? null,
    applied_at: new Date().toISOString(),
    success: body.success ?? false,
    savings: body.savings ?? null,
  });

  return NextResponse.json({ ok: true }, { headers: cors() });
}
