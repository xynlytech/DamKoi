"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

const PLATFORMS = ["all", "daraz", "cartup", "rokomari", "pickaboo", "chaldal", "othoba"];
const PLATFORM_COLOR: Record<string, string> = {
  daraz: "text-orange-400",
  cartup: "text-blue-400",
  rokomari: "text-green-400",
  pickaboo: "text-purple-400",
  chaldal: "text-teal-400",
  othoba: "text-pink-400",
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
        <h1 className="text-2xl font-black font-outfit">Products</h1>
        <span className="text-xs text-white/30">{total.toLocaleString()} total</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full nm-inset rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
          />
        </div>
        <select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
          className="nm-inset rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all bg-transparent"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p} className="bg-[#1a2332]">{p === "all" ? "All platforms" : p}</option>
          ))}
        </select>
        <button onClick={load} className="nm-raised rounded-xl px-3 py-2.5 text-white/40 hover:text-white transition-colors">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="nm-raised rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin text-indigo-400" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-white/30 py-16 text-sm">No products found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-white/30">
                <th className="text-left px-4 py-3 font-bold">Product</th>
                <th className="text-left px-4 py-3 font-bold hidden md:table-cell">Platform</th>
                <th className="text-right px-4 py-3 font-bold hidden sm:table-cell">Price</th>
                <th className="text-center px-4 py-3 font-bold hidden lg:table-cell">Stock</th>
                <th className="text-right px-4 py-3 font-bold hidden lg:table-cell">Last Scraped</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white/80 line-clamp-1 text-xs font-medium">{p.title}</p>
                    <p className="text-[9px] text-white/20 font-mono mt-0.5">{p.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${PLATFORM_COLOR[p.platform] ?? "text-white/30"}`}>
                      {p.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs hidden sm:table-cell">
                    {fmt(p.current_price)}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {p.in_stock === false ? (
                      <span className="text-[9px] text-rose-400">Out</span>
                    ) : p.in_stock ? (
                      <span className="text-[9px] text-emerald-400">In</span>
                    ) : (
                      <span className="text-[9px] text-white/20">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[10px] text-white/30 hidden lg:table-cell">
                    {p.last_scraped_at
                      ? new Date(p.last_scraped_at).toLocaleDateString("en-BD", { month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/product/${p.id}`}
                      target="_blank"
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-indigo-400 transition-colors inline-flex"
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
            className="flex items-center gap-1 px-3 py-2 nm-raised rounded-xl text-white/40 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <span className="text-white/30">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-2 nm-raised rounded-xl text-white/40 hover:text-white disabled:opacity-30 transition-colors"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
