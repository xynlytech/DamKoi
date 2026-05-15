import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ detail: 'email required' }, { status: 400, headers: cors() });

  const db = createServerClient();

  const { data: user } = await db.from('users').select('id').eq('email', email).single();
  if (!user) return NextResponse.json([], { headers: cors() });

  const { data: alerts } = await db
    .from('alerts')
    .select('id, target_price, is_active, created_at, last_triggered, products(id, title, url, image_url, platform)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(alerts ?? [], { headers: cors() });
}
