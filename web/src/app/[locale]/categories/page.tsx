import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";
const BASE_URL = "https://damkoi.xynly.com";

type Category = { name: string; slug: string; count: number };

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API}/categories?min=20`, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    return (await res.json()).categories ?? [];
  } catch {
    return [];
  }
}

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "All Product Categories — Price History in Bangladesh",
  description:
    "Browse every product category DamKoi tracks on Daraz Bangladesh. See real price history and spot fake discounts across phones, electronics, fashion, home, and more.",
  alternates: {
    canonical: `${BASE_URL}/en/categories`,
    languages: {
      en: `${BASE_URL}/en/categories`,
      bn: `${BASE_URL}/bn/categories`,
      "x-default": `${BASE_URL}/en/categories`,
    },
  },
};

export default async function CategoriesIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const categories = await getCategories();

  return (
    <div className="container mx-auto px-4 max-w-6xl py-10">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
          All product categories
        </h1>
        <p className="text-sm leading-relaxed max-w-3xl" style={{ color: "var(--text-muted)" }}>
          DamKoi tracks real price history across {categories.length}+ categories on
          Daraz Bangladesh. Pick a category to compare prices, see all-time lows, and
          tell genuine deals from inflated “discounts”.
        </p>
      </header>

      <div className="flex flex-wrap gap-2.5">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/${locale}/category/${c.slug}`}
            className="dk-card px-4 py-2.5 text-xs font-medium transition-all dk-focus"
            style={{ color: "var(--text-body)" }}
          >
            {c.name}
            <span className="ml-2 text-[10px]" style={{ color: "var(--text-faint)" }}>
              {c.count.toLocaleString("en-BD")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
