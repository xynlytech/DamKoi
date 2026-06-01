# Admin Products — Advanced Analytics Filters

**Date:** 2026-05-31  
**Status:** Approved  
**Optimization constraint:** Low storage (free tier), high-performance queries (indexed columns, no hot-path joins)

---

## Goal

Add rich analytics filter panel to `/admin/products` so admin can:
- Find products whose price dropped/rose, by how much, when
- Slice catalog by category, brand, stock state, activity
- Identify data-quality issues (stale, erroring, sparse-history products)

---

## Section 1 — Schema (products table)

Add 3 denormalized columns following existing `current_*` pattern:

```sql
ALTER TABLE products
  ADD COLUMN previous_price         INTEGER,       -- paisa, nullable
  ADD COLUMN price_changed_at       TIMESTAMPTZ,   -- when last change occurred
  ADD COLUMN price_change_delta_pct SMALLINT;      -- signed %, negative=drop positive=rise

CREATE INDEX idx_products_price_changed_at ON products (price_changed_at DESC)
  WHERE price_changed_at IS NOT NULL;

CREATE INDEX idx_products_price_change_delta ON products (price_change_delta_pct)
  WHERE price_change_delta_pct IS NOT NULL;
```

**Storage:** 14 bytes/row. At 100k products = 1.4 MB. Negligible vs 500 MB free tier.

**Rationale for denormalization:**
- O(1) filter queries via indexed columns — no join to `price_history` for common filters
- Same UPDATE path as `current_price` — scraper cost = 0 extra queries
- `price_change_delta_pct` stored (not computed) to enable indexed range queries

---

## Section 2 — Scraper Change ✅ Already Implemented

File: `backend/app/scraper/tasks.py` lines 922-930

Already writes all 3 fields when price changes. No action required.

---

## Section 3 — Admin API Route

File: `web/src/app/v1/admin/products/route.ts`

### New query params

| Param | Type | SQL condition |
|---|---|---|
| `has_price_change` | `"true"/"false"` | `price_changed_at IS NOT NULL` |
| `changed_since` | ISO date string | `price_changed_at >= ?` |
| `direction` | `"up"/"down"` | `price_change_delta_pct > 0` / `< 0` |
| `delta_min` | integer (%) | `price_change_delta_pct >= ?` |
| `delta_max` | integer (%) | `price_change_delta_pct <= ?` |
| `category` | string | `category = ?` |
| `brand` | string | `brand ILIKE '%?%'` |
| `is_active` | `"true"/"false"` | `is_active = ?` |
| `in_stock` | `"true"/"false"` | `current_in_stock = ?` |
| `price_min` | integer (paisa) | `current_price >= ?` |
| `price_max` | integer (paisa) | `current_price <= ?` |
| `discount_min` | integer (%) | `current_discount_pct >= ?` |
| `stale_days` | integer | `last_scraped_at < now() - interval '? days'` |
| `has_errors` | `"true"/"false"` | `consecutive_misses > 0` |
| `min_data_points` | integer | JOIN `price_history` WHERE `point_count >= ?` |
| `sort` | string | one of: `price_changed_at`, `current_price`, `price_change_delta_pct`, `last_scraped_at` |
| `sort_dir` | `"asc"/"desc"` | default `desc` |

JOIN `price_history` **only** when `min_data_points` param is set. All other filters use `products` columns — no join.

### Response fields added

```ts
previous_price: number | null        // paisa
price_changed_at: string | null      // ISO timestamp
price_change_delta_pct: number | null // signed integer %
```

---

## Section 4 — Admin UI

File: `web/src/app/[locale]/admin/products/page.tsx`

### Filter panel layout

**Row 1 — Quick-toggle chips:**
`Has Price Change` · `Price Dropped` · `Price Rose` · `Out of Stock` · `Inactive` · `Stale >7d` · `Scrape Errors`

Each chip maps to a URL param. Active = highlighted. Mutually exclusive where logical (`Price Dropped` / `Price Rose`).

**Row 2 — Dropdowns / inputs:**
- Platform (existing)
- Category (dropdown, populated from `distinct category` query)
- Direction: Any / Dropped / Rose (sync with chips)
- Changed since: date input
- Delta %: min / max number inputs

**Row 3 — Advanced (collapsed `<details>` by default):**
- Price range: ৳ min → ৳ max (convert paisa ↔ taka in UI)
- Discount ≥ N%
- Min data points (integer input)
- Brand search (text input, ILIKE)

### Table columns

| Column | Always shown | Conditional |
|---|---|---|
| Title / ID | ✓ | |
| Platform | ✓ | |
| Current price | ✓ | |
| Δ% | ✓ | |
| Changed date | | when `has_price_change` or `changed_since` active |
| Stock | ✓ | |
| Last scraped | ✓ | |
| Data points | | when `min_data_points` filter active |
| Consec. misses | | when `has_errors` filter active |

Sort headers on: Price, Δ%, Changed date, Last scraped (click toggles asc/desc).

### State management

All filter state in URL search params. No local state — allows deep-linking, browser back, bookmarks.

---

## Implementation Status

- [x] **Alembic migration** — `9f1a2b3c4d5e_add_price_change_fields_to_products.py` — 3 columns + 2 partial indexes
- [x] **Product model** — `backend/app/models/product.py` lines 42-44 — columns declared
- [x] **Scraper** — `backend/app/scraper/tasks.py` lines 922-930 — writes all 3 fields on price change
- [ ] **Admin API route** — `web/src/app/v1/admin/products/route.ts` — add filter params + new response fields
- [ ] **Admin UI** — `web/src/app/[locale]/admin/products/page.tsx` — filter panel + table columns
