import { NextRequest, NextResponse } from 'next/server';

const BACKEND = (process.env.BACKEND_URL ?? '').replace(/\/$/, '');

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token',
  };
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  if (!BACKEND) {
    return NextResponse.json(
      { detail: 'Backend not configured. Set BACKEND_URL in environment.' },
      { status: 503, headers: cors() },
    );
  }

  const url = new URL(req.url);
  const target = `${BACKEND}/v1/${path.join('/')}${url.search}`;

  const fwdHeaders = new Headers();
  for (const key of ['content-type', 'authorization', 'x-admin-token']) {
    const val = req.headers.get(key);
    if (val) fwdHeaders.set(key, val);
  }

  try {
    const init: RequestInit = { method: req.method, headers: fwdHeaders };
    if (!['GET', 'HEAD'].includes(req.method)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (init as any).duplex = 'half';
      init.body = req.body;
    }

    const resp = await fetch(target, init);
    const body = await resp.arrayBuffer();

    return new NextResponse(body, {
      status: resp.status,
      headers: {
        'content-type': resp.headers.get('content-type') ?? 'application/json',
        ...cors(),
      },
    });
  } catch {
    return NextResponse.json(
      { detail: 'Backend unavailable. Try again shortly.' },
      { status: 503, headers: cors() },
    );
  }
}

export const GET    = proxy;
export const POST   = proxy;
export const PUT    = proxy;
export const PATCH  = proxy;
export const DELETE = proxy;
