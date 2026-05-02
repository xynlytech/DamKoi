import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const outfit = Outfit({ 
  subsets: ["latin"], 
  variable: '--font-outfit',
  weight: ['500', '700', '800', '900']
});

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700']
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: '--font-mono',
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

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function RootLayout({
  children,
  params: { locale }
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const messages = await getMessages();

  return (
    <html lang={locale} className={`dark ${outfit.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="font-inter min-h-screen flex flex-col bg-[#0F172A] text-[#F1F5F9] selection:bg-indigo-500/30 selection:text-indigo-200">
        <NextIntlClientProvider messages={messages}>
        <header className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-50 rounded-2xl bg-white/3 backdrop-blur-xl border border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/15">
          <div className="mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
               <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-500">
                  <span className="text-xl">🐟</span>
               </div>
               <span className="text-2xl font-black font-outfit tracking-tighter bg-gradient-to-r from-white via-white to-indigo-400 bg-clip-text text-transparent">DamKoi</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              <Link href={`/${locale}/`} className="hover:text-indigo-400 transition-colors">Home</Link>
              <Link href={`/${locale}/deals`} className="hover:text-indigo-400 transition-colors">🔥 Deals</Link>
              <Link href={`/${locale}/dashboard`} className="hover:text-indigo-400 transition-colors">Dashboard</Link>
              <Link href={`/${locale}/alerts`} className="hover:text-indigo-400 transition-colors">My Alerts</Link>
              <Link href={`/${locale}/premium`} className="text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1">
                <span className="text-sm">⚡</span> Premium
              </Link>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                <Link href="/en" className={`px-2 py-1 rounded-full text-[9px] font-black transition-all ${locale === 'en' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}>EN</Link>
                <Link href="/bn" className={`px-2 py-1 rounded-full text-[9px] font-black transition-all ${locale === 'bn' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}>BN</Link>
              </div>
              <Link
                href={`/${locale}/install`}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-[10px] font-black hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95"
              >
                INSTALL EXTENSION
              </Link>
            </nav>
            {/* Mobile menu icon placeholder */}
            <div className="md:hidden flex flex-col gap-1.5 p-2 bg-white/5 rounded-lg">
              <div className="w-5 h-0.5 bg-white/40" />
              <div className="w-5 h-0.5 bg-white/40" />
            </div>
          </div>
        </header>

        <main className="flex-1 pt-24 pb-12">
          {children}
        </main>

        <footer className="border-t border-white/5 py-10 mt-auto bg-[#0F172A]/80 backdrop-blur-md">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛒</span>
                <span className="font-black font-outfit text-white tracking-tight">DamKoi</span>
                <span className="text-white/20 text-[10px] uppercase tracking-widest ml-4 font-bold border-l border-white/10 pl-4">Bangladesh Shopping Intelligence</span>
              </div>
              <nav className="flex items-center gap-6 text-xs text-white/30 font-medium">
                <Link href="/deals" className="hover:text-white/70 transition-colors">Deals</Link>
                <Link href="/dashboard" className="hover:text-white/70 transition-colors">Dashboard</Link>
                <Link href="/alerts" className="hover:text-white/70 transition-colors">My Alerts</Link>
                <Link href="/install" className="hover:text-white/70 transition-colors">Extension</Link>
                <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
              </nav>
              <p className="text-white/20 text-[10px] font-mono">
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

