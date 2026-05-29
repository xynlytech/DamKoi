import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { fetchCategories, type Category } from "@/lib/categories";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";
const BASE_URL = "https://damkoi.xynly.com";
const GRID = 48;

type Product = {
  id: string;
  title: string;
  image_url: string | null;
  current_price: number | null;
  original_price: number | null;
  discount_pct: number | null;
};

async function resolveCategory(slug: string): Promise<Category | null> {
  const cats = await fetchCategories(12);
  return cats.find((c) => c.slug === slug) ?? null;
}

async function getProducts(category: string): Promise<Product[]> {
  try {
    const res = await fetch(
      `${API}/products?category=${encodeURIComponent(category)}&limit=${GRID}`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return [];
    return (await res.json()).products ?? [];
  } catch {
    return [];
  }
}

function fmt(paisa: number | null | undefined): string {
  if (!paisa) return "—";
  return `৳${(paisa / 100).toLocaleString("en-BD")}`;
}

// Pre-render the highest-volume categories; the long tail renders on demand
// (ISR) and is still reachable from the /categories index.
export async function generateStaticParams() {
  const cats = await fetchCategories(50);
  return cats.slice(0, 200).map((c) => ({ slug: c.slug }));
}

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await resolveCategory(slug);
  if (!cat) return { title: "Category Not Found | DamKoi" };

  const title = `${cat.name} Price in Bangladesh — History & Best Deals`;
  const description = `Compare ${cat.count}+ ${cat.name.toLowerCase()} prices on Daraz Bangladesh. See real price history, spot fake discounts, and find the genuine lowest price. Updated daily by DamKoi.`;
  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/en/category/${slug}`,
      languages: {
        en: `${BASE_URL}/en/category/${slug}`,
        bn: `${BASE_URL}/bn/category/${slug}`,
        "x-default": `${BASE_URL}/en/category/${slug}`,
      },
    },
    openGraph: { title, description, url: `${BASE_URL}/en/category/${slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);

  const cat = await resolveCategory(slug);
  if (!cat) notFound();

  const products = await getProducts(cat.name);
  const priced = products.filter((p) => p.current_price && p.current_price > 0);
  const prices = priced.map((p) => p.current_price as number);
  const low = prices.length ? Math.min(...prices) : null;
  const high = prices.length ? Math.max(...prices) : null;

  const intro =
    `DamKoi tracks ${cat.count.toLocaleString("en-BD")}+ ${cat.name.toLowerCase()} ` +
    `listings on Daraz Bangladesh` +
    (low && high ? `, currently ranging from ${fmt(low)} to ${fmt(high)}` : "") +
    `. Instead of trusting a seller's “original” price, DamKoi keeps the real ` +
    `price history of each item so you can tell a genuine drop from an inflated ` +
    `“discount”. Tap any product to see its price chart, all-time low, and verdict. ` +
    `Prices are in Bangladeshi Taka and refreshed daily.`;

  const breadcrumbLd = {
    "@context": "https://schema.org/",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/en` },
      { "@type": "ListItem", position: 2, name: "Categories", item: `${BASE_URL}/en/categories` },
      { "@type": "ListItem", position: 3, name: cat.name, item: `${BASE_URL}/en/category/${slug}` },
    ],
  };
  const itemListLd = {
    "@context": "https://schema.org/",
    "@type": "ItemList",
    name: `${cat.name} in Bangladesh`,
    numberOfItems: priced.length,
    itemListElement: priced.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE_URL}/en/product/${p.id}`,
      name: p.title,
    })),
  };

  return (
    <div className="container mx-auto px-4 max-w-6xl py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbLd, itemListLd]) }}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] mb-8"
        style={{ color: "var(--text-faint)" }}
      >
        <Link href="/" className="hover:underline dk-focus">Home</Link>
        <span>/</span>
        <Link href="/categories" className="hover:underline dk-focus">Categories</Link>
        <span>/</span>
        <span style={{ color: "var(--text-muted)" }}>{cat.name}</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
          {cat.name} Price in Bangladesh
        </h1>
        <p className="text-sm leading-relaxed max-w-3xl" style={{ color: "var(--text-muted)" }}>
          {intro}
        </p>
      </header>

      {products.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No products tracked in this category yet. Check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/${locale}/product/${p.id}`}
              className="dk-card p-4 flex flex-col gap-3 transition-all dk-focus"
            >
              <div className="aspect-square rounded-xl overflow-hidden flex items-center justify-center" style={{ background: "var(--bg3)" }}>
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.title} className="w-full h-full object-contain p-2" loading="lazy" />
                ) : null}
              </div>
              <p className="text-xs leading-snug line-clamp-2" style={{ color: "var(--text-body)" }}>
                {p.title}
              </p>
              <div className="mt-auto flex items-baseline gap-2">
                <span className="text-sm font-semibold text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {fmt(p.current_price)}
                </span>
                {p.discount_pct ? (
                  <span className="text-[10px] font-semibold" style={{ color: "var(--green)" }}>
                    -{p.discount_pct}%
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12">
        <Link href="/categories" className="text-xs font-semibold uppercase tracking-widest dk-focus" style={{ color: "var(--lav)" }}>
          ← Browse all categories
        </Link>
      </div>
    </div>
  );
}
