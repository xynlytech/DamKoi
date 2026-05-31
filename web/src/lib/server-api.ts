/**
 * Server-side API base URL.
 *
 * During Vercel SSR, NEXT_PUBLIC_API_URL may point to a production domain
 * (e.g. api.damkoi.com) that isn't DNS-configured yet, causing all server-side
 * fetches to fail with "Could not resolve host". Using VERCEL_URL routes
 * directly to this deployment's own /v1/* proxy handlers, bypassing DNS.
 *
 * Client components should continue to use NEXT_PUBLIC_API_URL via their own
 * local `const API` so that browser requests go to the correct public endpoint.
 */
export const SERVER_API =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/v1`
    : process.env.NEXT_PUBLIC_API_URL ?? "https://damkoi.xynly.com/v1";
