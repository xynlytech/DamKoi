import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  // Security headers — trust signals (E-E-A-T) + technical-SEO hygiene.
  // HSTS is already applied at the edge by Vercel.
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js App Router requires unsafe-inline for hydration scripts.
      // unsafe-eval is needed by framer-motion and some Next.js internals.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // Product images come from Daraz CDN and other platform CDNs.
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // API calls to our backend + Supabase auth/realtime.
      "connect-src 'self' https://damkoi.xynly.com https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
