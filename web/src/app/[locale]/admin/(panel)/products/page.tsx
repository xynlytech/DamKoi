"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

const PLATFORMS = ["all", "daraz", "cartup", "rokomari", "pickaboo", "chaldal", "othoba"];
const PLATFORM_COLOR: Record<string, string> = {
  daraz: "#f97316",
  cartup: "#3b82f6",
  rokomari: "#ef4444",
  pickaboo: "#8b5cf6",
  chaldal: "#22c55e",
  othoba: "#ec4899",
};

type Product = {
  id: string;
  title: string;
  platform: string;
  category: string | null;
  brand: string | null;
  current_price: number | null;
  current_original_price: number | null;
  current_discount_pct: number | null;
  previous_price: number | null;
  price_changed_at: string | null;
  price_change_delta_pct: number | null;
  price_history_points: number | null;
  in_stock: boolean | null;
  is_active: boolean;
  consecutive_misses: number;
  last_scraped_at: string | null;
  out_of_stock_since: string | null;
  url: string;
  image_url: string | null;
};

function fmtPrice(p: number | null) {
  if (p === null || Number.isNaN(p)) return "—";
  return `৳${(p / 100).toLocaleString("en-BD")}`;
}

function fmtPct(p: number | null) {
  if (p === null || Number.isNaN(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p}%`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "2-digit" });
}

async function adminFetch(path: string) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
}

const selectStyle = {
  background: "var(--bg2)",
  border: "1px solid var(--border-sm)",
  color: "var(--text-body)",
  borderRadius: "0.75rem",
  padding: "0.625rem 0.75rem",
  fontSize: "0.875rem",
  outline: "none",
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors dk-focus"
      style={
        active
          ? { background: "rgba(139, 92, 246, 0.18)", border: "1px solid rgba(139, 92, 246, 0.5)", color: "#fff" }
          : { background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }
      }
    >
      {children}
    </button>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), 300);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <input
      type="text"
      placeholder="Search products…"
      value={local}
      onChange={(e) => handleChange(e.target.value)}
      className="dk-input pl-9 w-full"
    />
  );
}

export default function AdminProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const search = searchParams.get("search") ?? "";
  const platform = searchParams.get("platform") ?? "all";
  const category = searchParams.get("category") ?? "";
  const brand = searchParams.get("brand") ?? "";
  const sort = searchParams.get("sort") ?? "last_scraped_at";
  const sortDir = searchParams.get("sort_dir") ?? "desc";
  const priceMin = searchParams.get("price_min") ?? "";
  const priceMax = searchParams.get("price_max") ?? "";
  const deltaMin = searchParams.get("delta_min") ?? "";
  const deltaMax = searchParams.get("delta_max") ?? "";
  const discountMin = searchParams.get("discount_min") ?? "";
  const staleDays = searchParams.get("stale_days") ?? "";
  const changedSince = searchParams.get("changed_since") ?? "";
  const minDataPoints = searchParams.get("min_data_points") ?? "";
  const hasPriceChange = searchParams.get("has_price_change") ?? "";
  const direction = searchParams.get("direction") ?? "";
  const isActive = searchParams.get("is_active") ?? "";
  const inStock = searchParams.get("in_stock") ?? "";
  const hasErrors = searchParams.get("has_errors") ?? "";

  const updateParams = useCallback((updates: Record<string, string | null>, resetPage = true) => {
    const qs = new URLSearchParams(queryString);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") qs.delete(key);
      else qs.set(key, value);
    });
    if (resetPage) qs.set("page", "1");
    router.replace(`${pathname}?${qs.toString()}`);
  }, [pathname, queryString, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/admin/products?${queryString}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / limit);
  const hasAnyFilter =
    search ||
    platform !== "all" ||
    category ||
    brand ||
    sort !== "last_scraped_at" ||
    sortDir !== "desc" ||
    priceMin ||
    priceMax ||
    deltaMin ||
    deltaMax ||
    discountMin ||
    staleDays ||
    changedSince ||
    minDataPoints ||
    hasPriceChange ||
    direction ||
    isActive ||
    inStock ||
    hasErrors;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
            {total.toLocaleString()} total · filtered admin catalog
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 transition-colors dk-focus"
          style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={hasPriceChange === "true"} onClick={() => updateParams(hasPriceChange === "true" ? { has_price_change: null, direction: null, sort: null, sort_dir: null } : { has_price_change: "true", direction: null, sort: "price_changed_at", sort_dir: "desc" })}>
            Has change
          </Chip>
          <Chip active={direction === "down"} onClick={() => updateParams(direction === "down" ? { has_price_change: null, direction: null, sort: null, sort_dir: null } : { has_price_change: "true", direction: "down", sort: "price_change_delta_pct", sort_dir: "asc" })}>
            Price dropped
          </Chip>
          <Chip active={direction === "up"} onClick={() => updateParams(direction === "up" ? { has_price_change: null, direction: null, sort: null, sort_dir: null } : { has_price_change: "true", direction: "up", sort: "price_change_delta_pct", sort_dir: "desc" })}>
            Price rose
          </Chip>
          <Chip active={inStock === "false"} onClick={() => updateParams({ in_stock: inStock === "false" ? null : "false" })}>
            Out of stock
          </Chip>
          <Chip active={isActive === "false"} onClick={() => updateParams({ is_active: isActive === "false" ? null : "false" })}>
            Inactive
          </Chip>
          <Chip active={staleDays === "7"} onClick={() => updateParams({ stale_days: staleDays === "7" ? null : "7" })}>
            Stale {'>'}7d
          </Chip>
          <Chip active={hasErrors === "true"} onClick={() => updateParams({ has_errors: hasErrors === "true" ? null : "true" })}>
            Scrape errors
          </Chip>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={() => router.replace(pathname)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors dk-focus"
              style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
            >
              <X size={12} />
              Clear all
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }} />
            <SearchInput value={search} onChange={(v) => updateParams({ search: v })} />
          </div>
          <select
            value={platform}
            onChange={(e) => updateParams({ platform: e.target.value === "all" ? null : e.target.value })}
            style={selectStyle}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p} style={{ background: "#0e0c24" }}>
                {p === "all" ? "All platforms" : p}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            style={selectStyle}
          >
            <option value="last_scraped_at" style={{ background: "#0e0c24" }}>Sort: Last scraped</option>
            <option value="price_changed_at" style={{ background: "#0e0c24" }}>Sort: Date changed</option>
            <option value="price_change_delta_pct" style={{ background: "#0e0c24" }}>Sort: Change %</option>
            <option value="current_price" style={{ background: "#0e0c24" }}>Sort: Current price</option>
          </select>
          <select
            value={sortDir}
            onChange={(e) => updateParams({ sort_dir: e.target.value })}
            style={selectStyle}
          >
            <option value="desc" style={{ background: "#0e0c24" }}>Newest / high to low</option>
            <option value="asc" style={{ background: "#0e0c24" }}>Oldest / low to high</option>
          </select>
        </div>

        <details className="rounded-xl border border-[var(--border-sm)] bg-[var(--bg2)]/60 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-white">
            <Filter size={14} style={{ color: "var(--lav)" }} />
            Advanced filters
          </summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="text"
              value={category}
              onChange={(e) => updateParams({ category: e.target.value })}
              placeholder="Category"
              className="dk-input"
            />
            <input
              type="text"
              value={brand}
              onChange={(e) => updateParams({ brand: e.target.value })}
              placeholder="Brand"
              className="dk-input"
            />
            <input
              type="number"
              inputMode="numeric"
              value={priceMin}
              onChange={(e) => updateParams({ price_min: e.target.value })}
              placeholder="Min price (paisa)"
              className="dk-input"
            />
            <input
              type="number"
              inputMode="numeric"
              value={priceMax}
              onChange={(e) => updateParams({ price_max: e.target.value })}
              placeholder="Max price (paisa)"
              className="dk-input"
            />
            <input
              type="number"
              inputMode="numeric"
              value={deltaMin}
              onChange={(e) => updateParams({ delta_min: e.target.value })}
              placeholder="Min change %"
              className="dk-input"
            />
            <input
              type="number"
              inputMode="numeric"
              value={deltaMax}
              onChange={(e) => updateParams({ delta_max: e.target.value })}
              placeholder="Max change %"
              className="dk-input"
            />
            <input
              type="number"
              inputMode="numeric"
              value={discountMin}
              onChange={(e) => updateParams({ discount_min: e.target.value })}
              placeholder="Min discount %"
              className="dk-input"
            />
            <input
              type="number"
              inputMode="numeric"
              value={staleDays}
              onChange={(e) => updateParams({ stale_days: e.target.value })}
              placeholder="Stale days"
              className="dk-input"
            />
            <input
              type="date"
              value={changedSince}
              onChange={(e) => updateParams({ changed_since: e.target.value })}
              className="dk-input"
            />
            <input
              type="number"
              inputMode="numeric"
              value={minDataPoints}
              onChange={(e) => updateParams({ min_data_points: e.target.value })}
              placeholder="Min data points"
              className="dk-input"
            />
            <select
              value={isActive}
              onChange={(e) => updateParams({ is_active: e.target.value })}
              style={selectStyle}
            >
              <option value="" style={{ background: "#0e0c24" }}>Active: all</option>
              <option value="true" style={{ background: "#0e0c24" }}>Active: yes</option>
              <option value="false" style={{ background: "#0e0c24" }}>Active: no</option>
            </select>
            <select
              value={inStock}
              onChange={(e) => updateParams({ in_stock: e.target.value })}
              style={selectStyle}
            >
              <option value="" style={{ background: "#0e0c24" }}>Stock: all</option>
              <option value="true" style={{ background: "#0e0c24" }}>Stock: in</option>
              <option value="false" style={{ background: "#0e0c24" }}>Stock: out</option>
            </select>
            <select
              value={hasErrors}
              onChange={(e) => updateParams({ has_errors: e.target.value })}
              style={selectStyle}
            >
              <option value="" style={{ background: "#0e0c24" }}>Errors: all</option>
              <option value="true" style={{ background: "#0e0c24" }}>Errors: only</option>
              <option value="false" style={{ background: "#0e0c24" }}>Errors: none</option>
            </select>
            <select
              value={hasPriceChange}
              onChange={(e) => updateParams({ has_price_change: e.target.value })}
              style={selectStyle}
            >
              <option value="" style={{ background: "#0e0c24" }}>Change: all</option>
              <option value="true" style={{ background: "#0e0c24" }}>Change: only</option>
              <option value="false" style={{ background: "#0e0c24" }}>Change: none</option>
            </select>
          </div>
        </details>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)" }}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--lav)" }} />
          </div>
        ) : products.length === 0 ? (
          <p className="py-16 text-center text-sm" style={{ color: "var(--text-faint)" }}>
            No products found.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs" style={{ borderBottom: "1px solid var(--border-sm)", color: "var(--text-faint)" }}>
                <th className="px-4 py-3 text-left font-semibold">Product</th>
                <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Platform</th>
                <th className="px-4 py-3 text-right font-semibold hidden sm:table-cell">Price</th>
                <th className="px-4 py-3 text-right font-semibold hidden sm:table-cell">Δ%</th>
                <th className="px-4 py-3 text-right font-semibold hidden lg:table-cell">Changed</th>
                <th className="px-4 py-3 text-center font-semibold hidden lg:table-cell">Stock</th>
                <th className="px-4 py-3 text-right font-semibold hidden lg:table-cell">Last Scraped</th>
                <th className="px-4 py-3 text-right font-semibold hidden xl:table-cell">Pts</th>
                <th className="px-4 py-3 text-right font-semibold hidden xl:table-cell">Misses</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border-sm)" }}>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium line-clamp-1" style={{ color: "var(--text-secondary)" }}>
                      {p.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-faint)" }}>
                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{p.id.slice(0, 8)}…</span>
                      {p.category && <span>{p.category}</span>}
                      {p.brand && <span>{p.brand}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs font-semibold capitalize" style={{ color: PLATFORM_COLOR[p.platform] ?? "var(--text-faint)" }}>
                      {p.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs hidden sm:table-cell" style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-body)" }}>
                    {fmtPrice(p.current_price)}
                  </td>
                  <td
                    className="px-4 py-3 text-right text-xs hidden sm:table-cell"
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      color: p.price_change_delta_pct === null ? "var(--text-faint)" : p.price_change_delta_pct < 0 ? "var(--green)" : p.price_change_delta_pct > 0 ? "var(--red)" : "var(--text-body)",
                    }}
                  >
                    {fmtPct(p.price_change_delta_pct)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs hidden lg:table-cell" style={{ color: "var(--text-faint)" }}>
                    {fmtDate(p.price_changed_at)}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {p.in_stock === false ? (
                      <span className="text-xs" style={{ color: "var(--red)" }}>Out</span>
                    ) : p.in_stock ? (
                      <span className="text-xs" style={{ color: "var(--green)" }}>In</span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-faint)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs hidden lg:table-cell" style={{ color: "var(--text-faint)" }}>
                    {fmtDate(p.last_scraped_at)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs hidden xl:table-cell" style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {p.price_history_points ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs hidden xl:table-cell" style={{ color: p.consecutive_misses > 0 ? "var(--amber)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {p.consecutive_misses}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/product/${p.id}`}
                      target="_blank"
                      className="inline-flex rounded-lg p-1.5 transition-colors dk-focus"
                      style={{ color: "var(--text-faint)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--lav)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
                    >
                      <ArrowUpRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => updateParams({ page: String(Math.max(1, page - 1)) }, false)}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-xl px-3 py-2 transition-colors disabled:opacity-30 dk-focus"
            style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <span style={{ color: "var(--text-faint)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => updateParams({ page: String(Math.min(totalPages, page + 1)) }, false)}
            disabled={page === totalPages}
            className="flex items-center gap-1 rounded-xl px-3 py-2 transition-colors disabled:opacity-30 dk-focus"
            style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
