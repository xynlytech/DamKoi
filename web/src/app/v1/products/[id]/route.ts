import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = createServerClient();

  const { data: product, error } = await db
    .from('products')
    .select('id, title, url, image_url, platform, external_id, category, brand, is_active, first_seen_at, last_scraped_at, current_price, current_original_price, current_discount_pct, current_in_stock')
    .eq('id', id)
    .single();

  if (error || !product) {
    return NextResponse.json({ detail: 'Product not found' }, { status: 404, headers: cors() });
  }

  const p = product as Record<string, unknown>;
  return NextResponse.json(
    {
      ...product,
      current_price: p.current_price ?? null,
      original_price: p.current_original_price ?? null,
      discount_pct: p.current_discount_pct ?? null,
      in_stock: p.current_in_stock ?? true,
    },
    { headers: cors() },
  );
}
