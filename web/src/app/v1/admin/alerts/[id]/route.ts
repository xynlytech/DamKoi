import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = createServerClient();
  const { error } = await db.from('alerts').update({ is_active: body.is_active }).eq('id', id);
  if (error) return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });
  return NextResponse.json({ ok: true }, { headers: cors() });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServerClient();
  const { error } = await db.from('alerts').delete().eq('id', id);
  if (error) return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });
  return NextResponse.json({ ok: true }, { headers: cors() });
}
