import { NextRequest, NextResponse } from 'next/server';
import { cors } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(_req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ runs: [] }, { headers: cors() });
  }

  const resp = await fetch(
    'https://api.github.com/repos/xynlytech/DamKoi/actions/workflows/scraper.yml/runs?per_page=10',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      next: { revalidate: 60 },
    },
  );

  if (!resp.ok) return NextResponse.json({ runs: [] }, { headers: cors() });

  const json = await resp.json();
  const runs = (json.workflow_runs ?? []).map((r: { id: number; status: string; conclusion: string | null; created_at: string; updated_at: string; inputs?: { job?: string } }) => ({
    id: r.id,
    status: r.status,
    conclusion: r.conclusion,
    started_at: r.created_at,
    completed_at: r.updated_at,
    job: (r as { inputs?: { job?: string } }).inputs?.job ?? 'all',
  }));

  return NextResponse.json({ runs }, { headers: cors() });
}
