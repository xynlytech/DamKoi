"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, RefreshCw, Plus, Edit2, Trash2,
  Check, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";
const PLATFORMS = ["daraz", "cartup", "rokomari", "pickaboo", "chaldal", "othoba"];
const PAYMENT_METHODS = ["", "bkash", "nagad", "rocket", "card", "cod"];

type Coupon = {
  id: string;
  code: string;
  platform: string;
  product_id: string | null;
  discount_pct: number | null;
  discount_flat: number | null;
  min_spend: number | null;
  payment_method: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string | null;
};

type CouponForm = {
  platform: string;
  code: string;
  product_id: string;
  discount_pct: string;
  discount_flat: string;
  min_spend: string;
  payment_method: string;
  expires_at: string;
};

const EMPTY_FORM: CouponForm = {
  platform: "daraz",
  code: "",
  product_id: "",
  discount_pct: "",
  discount_flat: "",
  min_spend: "",
  payment_method: "",
  expires_at: "",
};

function fmt(p: number | null) {
  if (!p) return null;
  return `৳${(p / 100).toLocaleString("en-BD")}`;
}

async function adminFetch(path: string, opts?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
      ...((opts?.headers as Record<string, string>) ?? {}),
    },
  });
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [platformFilter, setPlatformFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (platformFilter) qs.set("platform", platformFilter);
      const res = await adminFetch(`/admin/coupons?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.items);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, platformFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (c: Coupon) => {
    setEditId(c.id);
    setForm({
      platform: c.platform,
      code: c.code,
      product_id: c.product_id ?? "",
      discount_pct: c.discount_pct != null ? String(c.discount_pct) : "",
      discount_flat: c.discount_flat != null ? String(c.discount_flat) : "",
      min_spend: c.min_spend != null ? String(c.min_spend) : "",
      payment_method: c.payment_method ?? "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.code || !form.platform) return;
    setSaving(true);
    try {
      const body = {
        platform: form.platform,
        code: form.code,
        product_id: form.product_id || null,
        discount_pct: form.discount_pct ? parseInt(form.discount_pct) : null,
        discount_flat: form.discount_flat ? parseInt(form.discount_flat) : null,
        min_spend: form.min_spend ? parseInt(form.min_spend) : null,
        payment_method: form.payment_method || null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };

      const res = editId
        ? await adminFetch(`/admin/coupons/${editId}`, { method: "PATCH", body: JSON.stringify(body) })
        : await adminFetch("/admin/coupons", { method: "POST", body: JSON.stringify(body) });

      if (res.ok) {
        setShowForm(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    setBusy(id);
    try {
      const res = await adminFetch(`/admin/coupons/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
        setTotal((t) => t - 1);
      }
    } finally {
      setBusy(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black font-outfit">Coupons</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">{total} total</span>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 nm-btn-primary rounded-xl text-xs font-black"
          >
            <Plus size={12} /> Add Coupon
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
          className="nm-inset rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all bg-transparent"
        >
          <option value="" className="bg-[#1a2332]">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p} className="bg-[#1a2332]">{p}</option>
          ))}
        </select>
        <button onClick={load} className="nm-raised rounded-xl px-3 py-2 text-white/40 hover:text-white transition-colors">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="nm-raised rounded-2xl p-5 border border-indigo-500/20">
          <h3 className="text-sm font-black mb-4">{editId ? "Edit Coupon" : "New Coupon"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {[
              { key: "platform", label: "Platform", type: "select", options: PLATFORMS },
              { key: "code", label: "Code *", type: "text", placeholder: "e.g. SAVE10" },
              { key: "product_id", label: "Product ID (optional)", type: "text", placeholder: "UUID or blank" },
              { key: "discount_pct", label: "Discount %", type: "number", placeholder: "e.g. 10" },
              { key: "discount_flat", label: "Flat off (paisa)", type: "number", placeholder: "e.g. 5000 = ৳50" },
              { key: "min_spend", label: "Min spend (paisa)", type: "number", placeholder: "e.g. 50000" },
              { key: "payment_method", label: "Payment method", type: "select", options: PAYMENT_METHODS },
              { key: "expires_at", label: "Expires", type: "date" },
            ].map(({ key, label, type, placeholder, options }) => (
              <div key={key}>
                <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">{label}</label>
                {type === "select" ? (
                  <select
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full nm-inset rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 bg-transparent"
                  >
                    {(options ?? []).map((o) => (
                      <option key={o} value={o} className="bg-[#1a2332]">{o || "Any"}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={type}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full nm-inset rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 nm-btn-primary rounded-xl text-xs font-black disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {editId ? "Save Changes" : "Create"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-1.5 px-4 py-2 nm-raised rounded-xl text-xs font-bold text-white/40 hover:text-white transition-colors"
            >
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="nm-raised rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin text-indigo-400" />
          </div>
        ) : coupons.length === 0 ? (
          <p className="text-center text-white/30 py-16 text-sm">No coupons found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-white/30">
                <th className="text-left px-4 py-3 font-bold">Code</th>
                <th className="text-left px-4 py-3 font-bold">Platform</th>
                <th className="text-left px-4 py-3 font-bold hidden md:table-cell">Discount</th>
                <th className="text-left px-4 py-3 font-bold hidden lg:table-cell">Payment</th>
                <th className="text-left px-4 py-3 font-bold hidden lg:table-cell">Expires</th>
                <th className="text-center px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-white font-bold">{c.code}</p>
                    {!c.is_active && (
                      <span className="text-[8px] text-white/20">inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] capitalize text-white/50">{c.platform}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs">
                    {c.discount_pct ? <span className="text-emerald-400">{c.discount_pct}% off</span>
                      : c.discount_flat ? <span className="text-emerald-400">{fmt(c.discount_flat)} off</span>
                      : <span className="text-white/20">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-[10px] text-white/40">{c.payment_method ?? "Any"}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-[10px] text-white/30">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-BD", { month: "short", day: "numeric" }) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-indigo-400 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        disabled={busy === c.id}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-rose-400 transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        {busy === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 nm-raised rounded-xl text-white/40 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <span className="text-white/30">Page {page} of {totalPages}</span>
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
