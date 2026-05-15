import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function POST(req: NextRequest) {
  let body: {
    product_id?: string;
    target_price?: number;
    email?: string;
    notify_via?: string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400, headers: cors() });
  }

  const { product_id, target_price, email, notify_via } = body;

  if (!product_id || !target_price || !email) {
    return NextResponse.json(
      { detail: 'product_id, target_price, and email are required' },
      { status: 400, headers: cors() },
    );
  }

  const db = createServerClient();

  // Find or create user by email (anonymous alerts — no auth required)
  const { data: existingUser } = await db
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: newUser, error: uErr } = await db
      .from('users')
      .insert({ email, created_at: new Date().toISOString() })
      .select('id')
      .single();
    if (uErr || !newUser) {
      return NextResponse.json({ detail: 'Could not create user record' }, { status: 500, headers: cors() });
    }
    userId = newUser.id;
  }

  const { data: alert, error: aErr } = await db
    .from('alerts')
    .insert({
      user_id: userId,
      product_id,
      target_price,
      notify_via: notify_via ?? ['email'],
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (aErr) {
    return NextResponse.json({ detail: aErr.message }, { status: 500, headers: cors() });
  }

  return NextResponse.json({ id: alert.id, message: 'Alert created' }, { status: 201, headers: cors() });
}
