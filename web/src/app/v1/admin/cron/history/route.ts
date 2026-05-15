import { NextRequest, NextResponse } from 'next/server';
import { cors, verifyAdmin } from '@/lib/supabase-server';

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const token = process.env.GH_PAT;
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

  // GitHub's list-runs endpoint omits `inputs` — fetch each run individually
  // only for workflow_dispatch events so we can read the `job` input.
  const rawRuns: Array<{
    id: number; status: string; conclusion: string | null;
    created_at: string; updated_at: string;
    event: string; display_title?: string;
    inputs?: Record<string, string>;
  }> = json.workflow_runs ?? [];

  // Batch-fetch inputs for workflow_dispatch runs (max 10, in parallel)
  const dispatchIds = rawRuns
    .filter((r) => r.event === 'workflow_dispatch' && !r.inputs)
    .map((r) => r.id);

  const inputsMap: Record<number, string> = {};
  if (dispatchIds.length > 0) {
    await Promise.all(
      dispatchIds.map(async (id) => {
        try {
          const dr = await fetch(
            `https://api.github.com/repos/xynlytech/DamKoi/actions/runs/${id}`,
            { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, next: { revalidate: 60 } },
          );
          if (dr.ok) {
            const d = await dr.json();
            inputsMap[id] = d.inputs?.job ?? '';
          }
        } catch { /* ignore */ }
      }),
    );
  }

  const runs = rawRuns.map((r) => {
    let job: string;
    if (r.event === 'schedule') {
      job = 'scheduled';
    } else if (r.inputs?.job) {
      job = r.inputs.job;
    } else if (inputsMap[r.id]) {
      job = inputsMap[r.id];
    } else {
      job = 'manual';
    }
    return {
      id: r.id,
      status: r.status,
      conclusion: r.conclusion,
      started_at: r.created_at,
      completed_at: r.updated_at,
      event: r.event,
      job,
    };
  });

  return NextResponse.json({ runs }, { headers: cors() });
}
