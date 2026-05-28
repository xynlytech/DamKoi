import type { Metadata } from "next";

// Auth-required: render fresh per request (no static prerender shell that can
// end up cached + served to the wrong session) and keep this out of search
// engines entirely.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
