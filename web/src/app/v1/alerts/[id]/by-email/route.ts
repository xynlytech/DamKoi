import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

async function getAlertForEmail(db: ReturnType<typeof createServerClient>, alertId: string, email: string) {
  const { data: user } = await db.from('users').select('id').eq('email', email).single();
  if (!user) return null;
  const { data: alert } = await db.from('alerts').select('id, user_id').eq('id', alertId).eq('user_id', user.id).single();
  return alert;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { email, is_active } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ detail: 'email required' }, { status: 400, headers: cors() });

  const db = createServerClient();
  const alert = await getAlertForEmail(db, id, email);
  if (!alert) return NextResponse.json({ detail: 'Alert not found' }, { status: 404, headers: cors() });

  await db.from('alerts').update({ is_active }).eq('id', id);
  return NextResponse.json({ ok: true }, { headers: cors() });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ detail: 'email required' }, { status: 400, headers: cors() });

  const db = createServerClient();
  const alert = await getAlertForEmail(db, id, email);
  if (!alert) return NextResponse.json({ detail: 'Alert not found' }, { status: 404, headers: cors() });

  await db.from('alerts').delete().eq('id', id);
  return NextResponse.json({ ok: true }, { headers: cors() });
}
