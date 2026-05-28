import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Block direct *.vercel.app access that bypasses Cloudflare proxy.
  // Only enforced when REQUIRE_CF_PROXY=true (set on Vercel production env only,
  // not on preview deployments, so previews continue to work).
  if (process.env.REQUIRE_CF_PROXY === 'true') {
    const cfRay = request.headers.get('cf-ray');
    if (!cfRay) {
      return new NextResponse('Access via damkoi.xynly.com only.', { status: 403 });
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next|_vercel|api|v1|.*\\..*).*)'],
};
