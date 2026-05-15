import createMiddleware from 'next-intl/middleware';
import { routing } from './routing';

export default createMiddleware(routing);

export const config = {
  // Match all paths except Next.js internals, static files, API routes, and backend proxy
  matcher: ['/((?!_next|_vercel|api|v1|.*\\..*).*)'],
};
