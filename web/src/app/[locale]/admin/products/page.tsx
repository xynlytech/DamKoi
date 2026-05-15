"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";

const PLATFORMS = ["all", "daraz", "cartup", "rokomari", "pickaboo", "chaldal", "othoba"];
const PLATFORM_COLOR: Record<string, string> = {
  daraz: "#f97316", cartup: "#3b82f6", rokomari: "#ef4444",
  pickaboo: "#8b5cf6", chaldal: "#22c55e", othoba: "#ec4899",
};

type Product = {
  id: string;
  title: string;
  platform: string;
  current_price: number | null;
  in_stock: boolean | null;
  is_active: boolean;
  last_scraped_at: string | null;
  url: string;
  image_url: string | null;
};

function fmt(p: number | null) {
  if (!p) return "—";
  return `৳${(p / 100).toLocaleString("en-BD")}`;
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

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) qs.set("search", search);
      if (platform !== "all") qs.set("platform", platform);
      const res = await adminFetch(`/admin/products?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, platform]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Products</h1>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>{total.toLocaleString()} total</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-faint)" }} />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="dk-input pl-9 w-full"
          />
        </div>
        <select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
          style={selectStyle}
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p} style={{ background: "#0e0c24" }}>{p === "all" ? "All platforms" : p}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="rounded-xl px-3 py-2.5 transition-colors dk-focus"
          style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="dk-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--lav)" }} />
          </div>
        ) : products.length === 0 ? (
          <p className="text-center py-16 text-sm" style={{ color: "var(--text-faint)" }}>No products found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest" style={{ borderBottom: "1px solid var(--border-sm)", color: "var(--text-faint)" }}>
                <th className="text-left px-4 py-3 font-semibold">Product</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Platform</th>
                <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">Price</th>
                <th className="text-center px-4 py-3 font-semibold hidden lg:table-cell">Stock</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">Last Scraped</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border-sm)" }}>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium line-clamp-1" style={{ color: "var(--text-secondary)" }}>{p.title}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: "var(--text-faint)", fontFamily: "'IBM Plex Mono', monospace" }}>{p.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: PLATFORM_COLOR[p.platform] ?? "var(--text-faint)" }}>
                      {p.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs hidden sm:table-cell" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-body)" }}>
                    {fmt(p.current_price)}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {p.in_stock === false ? (
                      <span className="text-[9px]" style={{ color: "var(--red)" }}>Out</span>
                    ) : p.in_stock ? (
                      <span className="text-[9px]" style={{ color: "var(--green)" }}>In</span>
                    ) : (
                      <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[10px] hidden lg:table-cell" style={{ color: "var(--text-faint)" }}>
                    {p.last_scraped_at
                      ? new Date(p.last_scraped_at).toLocaleDateString("en-BD", { month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/product/${p.id}`}
                      target="_blank"
                      className="p-1.5 rounded-lg transition-colors inline-flex dk-focus"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-xl transition-colors disabled:opacity-30 dk-focus"
            style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <span style={{ color: "var(--text-faint)" }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-xl transition-colors disabled:opacity-30 dk-focus"
            style={{ background: "var(--bg1)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
