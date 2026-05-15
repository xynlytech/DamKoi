import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function verifyAdmin(req: NextRequest): Promise<{ userId: string } | NextResponse> {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401, headers: cors() });
  }
  const token = auth.slice(7);
  const db = createServerClient();
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401, headers: cors() });
  }
  const { data: row } = await db.from('users').select('is_admin').eq('id', user.id).single();
  if (!row?.is_admin) {
    return NextResponse.json({ detail: 'Forbidden' }, { status: 403, headers: cors() });
  }
  return { userId: user.id };
}
