import type { Metadata } from "next";
import { Space_Grotesk, Inter, Noto_Sans_Bengali } from "next/font/google";
import Link from "next/link";
import "../globals.css";
import NavAuthButton from "@/components/NavAuthButton";
import ThemeToggle from "@/components/ThemeToggle";
import MobileNav from "@/components/MobileNav";

// Headings + brand
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "600", "700"],
  display: "swap",
});

// Body copy, UI, numbers (tabular figures)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Bangla text and the Taka sign. Not preloaded: most first views are English,
// and the browser only fetches it once a Bengali glyph appears.
const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
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
  verification: {
    google: "w7TiimY4lDd3r4g-ijPZTQguKmP_XExaAGFM36fCOcQ",
  },
};

import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/routing";

// Pre-render both locales statically (enables ISR instead of fully-dynamic SSR
// → cacheable HTML, faster TTFB/LCP for crawlers and users).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  // Sitewide entity schema — establishes DamKoi as a brand/site to Google.
  const orgLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://damkoi.xynly.com/#organization",
        name: "DamKoi",
        url: "https://damkoi.xynly.com",
        logo: "https://damkoi.xynly.com/icon.png",
        image: "https://damkoi.xynly.com/en/opengraph-image",
        description:
          "Bangladesh shopping intelligence: real price history, fake-discount detection, and cross-platform price comparison.",
        slogan: "Stop paying for fake discounts.",
        areaServed: { "@type": "Country", name: "Bangladesh" },
        knowsAbout: [
          "price tracking",
          "price history",
          "fake discount detection",
          "online shopping in Bangladesh",
          "Daraz",
          "price comparison",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          email: "contact@xynly.com",
          contactType: "customer support",
          areaServed: "BD",
          availableLanguage: ["English", "Bengali"],
        },
      },
      {
        "@type": "WebSite",
        "@id": "https://damkoi.xynly.com/#website",
        name: "DamKoi",
        url: "https://damkoi.xynly.com",
        publisher: { "@id": "https://damkoi.xynly.com/#organization" },
        inLanguage: ["en", "bn"],
      },
    ],
  };

  return (
    <html
      lang={locale}
      data-theme="dark"
      className={`${spaceGrotesk.variable} ${inter.variable} ${notoBengali.variable}`}
    >
      <head>
        {/* Preconnect to Daraz product-image CDN — saves ~300 ms LCP */}
        <link rel="preconnect" href="https://bd-live-21.slatic.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://bd-live-21.slatic.net" />
      </head>
      <body className="min-h-dvh flex flex-col" style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
        <NextIntlClientProvider messages={messages}>
          {/* ── Navbar ── */}
          <header className="fixed top-0 left-0 right-0 z-50 dk-nav">
            <div className="mx-auto px-5 h-16 flex items-center justify-between gap-4 max-w-6xl">
              {/* Logo */}
              <Link href={`/${locale}`} className="flex items-center gap-2.5 flex-shrink-0 dk-focus" aria-label="DamKoi home">
                <span className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
                  <img src="/dk-logo.svg" alt="" className="w-full h-full object-contain" />
                </span>
                <span className="dk-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>DamKoi</span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1" aria-label="Main">
                <Link href={`/${locale}/deals`}      className="dk-nav-link dk-focus">Deals</Link>
                <Link href={`/${locale}/categories`} className="dk-nav-link dk-focus">Categories</Link>
                <Link href={`/${locale}/dashboard`}  className="dk-nav-link dk-focus">Dashboard</Link>
                <Link href={`/${locale}/alerts`}     className="dk-nav-link dk-focus">Alerts</Link>
                <span className="w-px h-5 mx-2" style={{ background: "var(--border-sm)" }} aria-hidden />
                <NavAuthButton />
                <ThemeToggle />
                <Link href={`/${locale}/install`} className="dk-btn-primary ml-2 dk-focus" style={{ minHeight: "2.5rem", padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                  Get the extension
                </Link>
              </nav>

              {/* Mobile: nav drawer */}
              <MobileNav locale={locale} />
            </div>
          </header>

          {/* ── Main Content ── */}
          <main className="flex-1 pt-16">
            {children}
          </main>

          {/* ── Footer ── */}
          <footer className="mt-auto py-10" style={{ borderTop: "1px solid var(--border-sm)", background: "var(--bg1)" }}>
            <div className="mx-auto px-5 max-w-6xl flex flex-col md:flex-row justify-between gap-8">
              <div className="max-w-xs">
                <Link href={`/${locale}`} className="flex items-center gap-2.5 dk-focus w-fit">
                  <span className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)" }}>
                    <img src="/dk-logo.svg" alt="" className="w-full h-full object-contain" />
                  </span>
                  <span className="dk-display font-bold" style={{ color: "var(--text-primary)" }}>DamKoi</span>
                </Link>
                <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
                  Real price history and honest deal verdicts for online shoppers in Bangladesh.
                </p>
              </div>

              <nav className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-2.5 text-sm" aria-label="Footer">
                {[["Deals", "deals"], ["Categories", "categories"], ["Dashboard", "dashboard"], ["Price alerts", "alerts"], ["Browser extension", "install"], ["Privacy", "privacy"]].map(([label, href]) => (
                  <Link key={href} href={`/${locale}/${href}`} className="dk-nav-link dk-focus" style={{ padding: 0, fontSize: "0.875rem" }}>{label}</Link>
                ))}
              </nav>
            </div>
            <div className="mx-auto px-5 max-w-6xl mt-8 pt-6 text-xs flex flex-wrap justify-between gap-2" style={{ borderTop: "1px solid var(--border-sm)", color: "var(--text-faint)" }}>
              <span>&copy; {new Date().getFullYear()} DamKoi</span>
              <span>Prices in Bangladeshi Taka, checked daily.</span>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
