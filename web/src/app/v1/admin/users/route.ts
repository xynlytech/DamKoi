import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10));
  const offset = (page - 1) * limit;

  const db = createServerClient();
  const { data, count, error } = await db
    .from('users')
    .select('id, email, is_premium, is_admin, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500, headers: cors() });
  return NextResponse.json({ users: data ?? [], total: count ?? 0, page, limit }, { headers: cors() });
}
