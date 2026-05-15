import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "../globals.css";
import NavAuthButton from "@/components/NavAuthButton";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "DamKoi | Bangladesh Shopping Intelligence",
    template: "%s | DamKoi",
  },
  description:
    "See if Daraz, Cartup, Rokomari, and Pickaboo discounts are real or fake. Real price history, cross-platform compare, and deal scores for BD shoppers.",
  metadataBase: new URL("https://damkoi.xynly.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    siteName: "DamKoi",
    locale: "en_BD",
    type: "website",
  },
};

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-dvh flex flex-col" style={{ backgroundColor: "var(--bg)", color: "#fff", fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }}>
        <NextIntlClientProvider messages={messages}>
          {/* ── Navbar ── */}
          <header className="fixed top-0 left-0 right-0 z-50 dk-nav">
            <div className="mx-auto px-5 h-16 flex items-center justify-between gap-4 max-w-6xl">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 flex-shrink-0">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
                  <img src="/dk-logo.svg" alt="DamKoi" className="w-full h-full object-contain" />
                </div>
                <span className="text-lg font-bold tracking-tight text-white">DamKoi</span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-6">
                <Link href={`/${locale}/`}         className="text-xs font-medium text-white/40 hover:text-white/80 transition-colors uppercase tracking-widest dk-focus">Home</Link>
                <Link href={`/${locale}/deals`}     className="text-xs font-medium text-white/40 hover:text-white/80 transition-colors uppercase tracking-widest dk-focus">Deals</Link>
                <Link href={`/${locale}/dashboard`} className="text-xs font-medium text-white/40 hover:text-white/80 transition-colors uppercase tracking-widest dk-focus">Dashboard</Link>
                <Link href={`/${locale}/alerts`}    className="text-xs font-medium text-white/40 hover:text-white/80 transition-colors uppercase tracking-widest dk-focus">Alerts</Link>
                <NavAuthButton />
                <Link href={`/${locale}/install`} className="dk-btn-primary text-xs px-4 py-2.5 dk-focus">
                  Install Extension
                </Link>
              </nav>

              {/* Mobile menu */}
              <button aria-label="Open menu" className="md:hidden p-2 rounded-lg dk-focus" style={{ border: "1px solid var(--border-sm)", background: "var(--bg2)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
                </svg>
              </button>
            </div>
          </header>

          {/* ── Main Content ── */}
          <main className="flex-1 pt-16">
            {children}
          </main>

          {/* ── Footer ── */}
          <footer className="mt-auto py-12" style={{ borderTop: "1px solid var(--border-sm)" }}>
            <div className="mx-auto px-5 max-w-6xl">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
                    <img src="/dk-logo.svg" alt="DamKoi" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-bold text-white">DamKoi</span>
                  <span className="text-white/20 text-[10px] uppercase tracking-widest ml-2 hidden sm:block" style={{ borderLeft: "1px solid var(--border-sm)", paddingLeft: "0.5rem" }}>
                    Bangladesh Shopping Intelligence
                  </span>
                </div>

                <nav className="flex flex-wrap items-center justify-center gap-5">
                  {[["Deals", "/deals"], ["Dashboard", "/dashboard"], ["Alerts", "/alerts"], ["Extension", "/install"], ["Privacy", "/privacy"]].map(([label, href]) => (
                    <Link key={href} href={href} className="text-xs text-white/30 hover:text-white/60 transition-colors dk-focus">{label}</Link>
                  ))}
                </nav>

                <p className="text-white/20 text-[10px]" style={{ fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
                  &copy; {new Date().getFullYear()} DamKoi
                </p>
              </div>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
