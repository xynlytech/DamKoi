"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, RefreshCw, Plus, Edit2, Trash2,
  Check, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://damkoi.xynly.com/v1";
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
  platform: "daraz", code: "", product_id: "",
  discount_pct: "", discount_flat: "", min_spend: "",
  payment_method: "", expires_at: "",
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

const selectStyle: React.CSSProperties = {
  background: "var(--bg2)",
  border: "1px solid var(--border-sm)",
  color: "var(--text-body)",
  borderRadius: "0.75rem",
  padding: "0.625rem 0.75rem",
  fontSize: "0.875rem",
  outline: "none",
  width: "100%",
};

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

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); };

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
      if (res.ok) { setShowForm(false); load(); }
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
        <h1 className="text-2xl font-bold text-white">Coupons</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>{total} total</span>
          <button onClick={openCreate} className="dk-btn-primary flex items-center gap-1.5 text-xs">
            <Plus size={12} /> Add Coupon
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
          style={{ ...selectStyle, width: "auto" }}
        >
          <option value="" style={{ background: "#0e0c24" }}>All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p} style={{ background: "#0e0c24" }}>{p}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="rounded-xl px-3 py-2 transition-colors dk-focus"
          style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="dk-card p-5" style={{ border: "1px solid rgba(124,58,237,0.2)" }}>
          <h3 className="text-sm font-semibold mb-4 text-white">{editId ? "Edit Coupon" : "New Coupon"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {[
              { key: "platform",        label: "Platform",              type: "select",  options: PLATFORMS,        placeholder: "" },
              { key: "code",            label: "Code *",                type: "text",    options: [],               placeholder: "e.g. SAVE10" },
              { key: "product_id",      label: "Product ID (optional)", type: "text",    options: [],               placeholder: "UUID or blank" },
              { key: "discount_pct",    label: "Discount %",            type: "number",  options: [],               placeholder: "e.g. 10" },
              { key: "discount_flat",   label: "Flat off (paisa)",      type: "number",  options: [],               placeholder: "e.g. 5000 = ৳50" },
              { key: "min_spend",       label: "Min spend (paisa)",     type: "number",  options: [],               placeholder: "e.g. 50000" },
              { key: "payment_method",  label: "Payment method",        type: "select",  options: PAYMENT_METHODS,  placeholder: "" },
              { key: "expires_at",      label: "Expires",               type: "date",    options: [],               placeholder: "" },
            ].map(({ key, label, type, placeholder, options }) => (
              <div key={key}>
                <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-faint)" }}>{label}</label>
                {type === "select" ? (
                  <select
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={selectStyle}
                  >
                    {options.map((o) => (
                      <option key={o} value={o} style={{ background: "#0e0c24" }}>{o || "Any"}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={type}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="dk-input w-full"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="dk-btn-primary flex items-center gap-1.5 text-xs disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {editId ? "Save Changes" : "Create"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-colors dk-focus"
              style={{ background: "var(--bg2)", border: "1px solid var(--border-sm)", color: "var(--text-muted)" }}
            >
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="dk-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--lav)" }} />
          </div>
        ) : coupons.length === 0 ? (
          <p className="text-center py-16 text-sm" style={{ color: "var(--text-faint)" }}>No coupons found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest" style={{ borderBottom: "1px solid var(--border-sm)", color: "var(--text-faint)" }}>
                <th className="text-left px-4 py-3 font-semibold">Code</th>
                <th className="text-left px-4 py-3 font-semibold">Platform</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Discount</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Payment</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Expires</th>
                <th className="text-center px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border-sm)" }}>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.code}</p>
                    {!c.is_active && (
                      <span className="text-[8px]" style={{ color: "var(--text-faint)" }}>inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>{c.platform}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs">
                    {c.discount_pct ? <span style={{ color: "var(--green)" }}>{c.discount_pct}% off</span>
                      : c.discount_flat ? <span style={{ color: "var(--green)" }}>{fmt(c.discount_flat)} off</span>
                      : <span style={{ color: "var(--text-faint)" }}>—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.payment_method ?? "Any"}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-BD", { month: "short", day: "numeric" }) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg transition-colors dk-focus"
                        style={{ color: "var(--text-faint)" }}
                        title="Edit"
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--lav)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        disabled={busy === c.id}
                        className="p-1.5 rounded-lg transition-colors disabled:opacity-40 dk-focus"
                        style={{ color: "var(--text-faint)" }}
                        title="Delete"
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
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
