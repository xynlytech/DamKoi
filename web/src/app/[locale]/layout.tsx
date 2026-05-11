import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "../globals.css";
import { Activity, Flame, Zap } from "lucide-react";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["500", "700", "800", "900"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "DamKoi | Bangladesh Shopping Intelligence",
    template: "%s | DamKoi",
  },
  description:
    "See if Daraz, Cartup, Rokomari, and Pickaboo discounts are real or fake. Real price history, cross-platform compare, and deal scores for BD shoppers.",
  metadataBase: new URL("https://damkoi.xynly.com"),
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
      className={`dark ${outfit.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="font-inter min-h-dvh flex flex-col bg-background text-foreground selection:bg-indigo-500/30 selection:text-indigo-200">
        <NextIntlClientProvider messages={messages}>
          {/* ── Floating Navbar ── */}
          <header className="fixed top-5 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50 rounded-2xl nm-header transition-all duration-300">
            <div className="mx-auto px-5 h-16 flex items-center justify-between gap-4">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
                <div className="w-9 h-9 rounded-xl nm-raised flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 transition-colors duration-300">
                  <Activity size={20} />
                </div>
                <span className="text-xl font-black font-outfit tracking-tighter bg-gradient-to-r from-white via-white to-indigo-400 bg-clip-text text-transparent">
                  DamKoi
                </span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-6 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
                <Link
                  href={`/${locale}/`}
                  className="hover:text-indigo-400 transition-colors nm-focus"
                >
                  Home
                </Link>
                <Link
                  href={`/${locale}/deals`}
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1 nm-focus"
                >
                  <Flame size={13} className="text-indigo-500" /> Deals
                </Link>
                <Link
                  href={`/${locale}/dashboard`}
                  className="hover:text-indigo-400 transition-colors nm-focus"
                >
                  Dashboard
                </Link>
                <Link
                  href={`/${locale}/alerts`}
                  className="hover:text-indigo-400 transition-colors nm-focus"
                >
                  My Alerts
                </Link>
                <Link
                  href={`/${locale}/premium`}
                  className="text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1 nm-focus"
                >
                  <Zap size={13} /> Premium
                </Link>

                {/* Lang switcher */}
                <div className="nm-inset rounded-full p-1 flex">
                  <Link
                    href="/en"
                    className={`px-2.5 py-1 rounded-full text-[9px] font-black transition-all ${
                      locale === "en"
                        ? "nm-btn-primary text-white shadow-none"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    EN
                  </Link>
                  <Link
                    href="/bn"
                    className={`px-2.5 py-1 rounded-full text-[9px] font-black transition-all ${
                      locale === "bn"
                        ? "nm-btn-primary text-white shadow-none"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    BN
                  </Link>
                </div>

                <Link
                  href={`/${locale}/install`}
                  className="nm-btn-primary px-5 py-2.5 rounded-xl text-[10px] nm-focus"
                >
                  INSTALL EXTENSION
                </Link>
              </nav>

              {/* Mobile hamburger */}
              <button
                aria-label="Open menu"
                className="md:hidden nm-raised rounded-xl p-2.5 flex flex-col gap-1.5 nm-interactive nm-focus"
              >
                <span className="block w-5 h-0.5 bg-white/50 rounded-full" />
                <span className="block w-5 h-0.5 bg-white/50 rounded-full" />
                <span className="block w-3 h-0.5 bg-white/30 rounded-full" />
              </button>
            </div>
          </header>

          {/* ── Main Content ── */}
          <main className="flex-1 pt-28 pb-16">
            {children}
          </main>

          {/* ── Footer ── */}
          <footer className="mt-auto py-10">
            <div className="container mx-auto px-4 max-w-5xl">
              <div className="nm-raised rounded-2xl px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-5">
                <div className="flex items-center gap-2.5">
                  <div className="nm-raised w-8 h-8 rounded-lg flex items-center justify-center text-indigo-400">
                    <Activity size={16} />
                  </div>
                  <span className="font-black font-outfit text-white tracking-tight">DamKoi</span>
                  <span className="text-white/20 text-[10px] uppercase tracking-widest ml-3 font-bold border-l border-white/10 pl-3 hidden sm:block">
                    Bangladesh Shopping Intelligence
                  </span>
                </div>

                <nav className="flex flex-wrap items-center justify-center gap-5 text-xs text-white/30 font-medium">
                  {[
                    ["Deals", "/deals"],
                    ["Dashboard", "/dashboard"],
                    ["My Alerts", "/alerts"],
                    ["Extension", "/install"],
                    ["Privacy", "/privacy"],
                  ].map(([label, href]) => (
                    <Link
                      key={href}
                      href={href}
                      className="hover:text-white/70 transition-colors nm-focus"
                    >
                      {label}
                    </Link>
                  ))}
                </nav>

                <p className="text-white/20 text-[10px] font-mono flex-shrink-0">
                  &copy; {new Date().getFullYear()} DAMKOI_SYS.V2
                </p>
              </div>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
