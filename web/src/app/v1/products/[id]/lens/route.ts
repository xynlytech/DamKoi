import { NextRequest, NextResponse } from 'next/server';
import { cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  return NextResponse.json({ detail: 'Not available yet' }, { status: 404, headers: cors() });
}
