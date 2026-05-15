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
    .select('id, title, url, image_url, platform, external_id, category, brand, is_active, first_seen_at, last_scraped_at')
    .eq('id', id)
    .single();

  if (error || !product) {
    return NextResponse.json({ detail: 'Product not found' }, { status: 404, headers: cors() });
  }

  // Latest price
  const { data: snap } = await db
    .from('price_snapshots')
    .select('price, original_price, discount_pct, in_stock, scraped_at')
    .eq('product_id', id)
    .order('scraped_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json(
    {
      ...product,
      current_price: snap?.price ?? null,
      original_price: snap?.original_price ?? null,
      discount_pct: snap?.discount_pct ?? null,
      in_stock: snap?.in_stock ?? true,
    },
    { headers: cors() },
  );
}
