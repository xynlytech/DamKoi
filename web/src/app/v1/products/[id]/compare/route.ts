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

  // Get this product to find its match_group_id
  const { data: product } = await db
    .from('products')
    .select('id, title, url, image_url, platform, match_group_id')
    .eq('id', id)
    .single();

  if (!product) {
    return NextResponse.json({ alternatives: [] }, { headers: cors() });
  }

  let alternatives: unknown[] = [];

  if (product.match_group_id) {
    // Products in same match group = cross-platform matches
    const { data: grouped } = await db
      .from('products')
      .select('id, title, url, image_url, platform, current_price')
      .eq('match_group_id', product.match_group_id);

    if (grouped && grouped.length > 0) {
      alternatives = grouped.map((p: { id: string; title: string; url: string; image_url: string; platform: string; current_price: number | null }) => ({
        id: p.id,
        title: p.title,
        url: p.url,
        image_url: p.image_url,
        platform: p.platform,
        current_price: p.current_price ?? null,
        is_original_request: p.id === id,
      }));
    }
  }

  return NextResponse.json({ alternatives }, { headers: cors() });
}
