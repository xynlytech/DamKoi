/**
 * Server-side API base URL.
 *
 * Server components and OG image routes call this app's own /v1/* handlers
 * over HTTP. On Netlify, `URL` is the site's primary URL (the *.netlify.app
 * subdomain until a custom domain is attached, then the custom domain), so
 * self-fetches resolve without depending on NEXT_PUBLIC_API_URL's DNS.
 * `INTERNAL_API_ORIGIN` can override this explicitly.
 *
 * Client components should continue to use NEXT_PUBLIC_API_URL via their own
 * local `const API` so that browser requests go to the correct public endpoint.
 */
const siteOrigin =
  process.env.INTERNAL_API_ORIGIN ??
  process.env.URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

export const SERVER_API = siteOrigin
  ? `${siteOrigin.replace(/\/+$/, "")}/v1`
  : process.env.NEXT_PUBLIC_API_URL ?? "https://damkoi.xynly.com/v1";
