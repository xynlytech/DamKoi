import { NextRequest, NextResponse } from 'next/server';
import { cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  // AI lens — coming soon
  return NextResponse.json({ insights: [], summary: null }, { headers: cors() });
}
