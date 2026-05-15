import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors, verifyAdmin } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = createServerClient();
  const allowed = ['is_premium', 'is_admin'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(updates).length) return NextResponse.json({ detail: 'No valid fields' }, { status: 400, headers: cors() });
  const { error } = await db.from('users').update(updates).eq('id', id);
  if (error) return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });
  return NextResponse.json({ ok: true }, { headers: cors() });
}
