import { NextRequest, NextResponse } from 'next/server';
import { cors } from '@/lib/supabase-server';

const VALID_JOBS = ['alerts', 'coupons', 'digest', 'matching', 'backfill', 'cleanup', 'scrape', 'harvest', 'all'];

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;

  if (!VALID_JOBS.includes(job)) {
    return NextResponse.json({ detail: `Unknown job: ${job}` }, { status: 400, headers: cors() });
  }

  // Trigger GitHub Actions workflow via API
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ detail: 'GITHUB_TOKEN not configured' }, { status: 503, headers: cors() });
  }

  const resp = await fetch(
    'https://api.github.com/repos/xynlytech/DamKoi/actions/workflows/scraper.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main', inputs: { job } }),
    },
  );

  if (!resp.ok && resp.status !== 204) {
    return NextResponse.json({ detail: `GitHub dispatch failed: ${resp.status}` }, { status: 502, headers: cors() });
  }

  return NextResponse.json({ ok: true, job, message: `Job '${job}' dispatched to GitHub Actions` }, { headers: cors() });
}
