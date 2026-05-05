# DamKoi — 90-Day Implementation Plan
## Companion to PRD v3.0 (BuyHatke for Bangladesh)

**Version:** 3.0 (Reality-Calibrated)
**Date:** 2026-05-02
**Owner:** Md. Jubair Hasan
**Plan horizon:** Days 1–90 (May–Aug 2026)
**Source PRD:** [PRD_DamKoi_v2.md](PRD_DamKoi_v2.md)

---

## What's Already Built

### Backend — 95% done

| Component | Status | Notes |
|---|---|---|
| All 6 scrapers (Daraz, Cartup, Rokomari, Pickaboo, Chaldal, Othoba) | ✅ Built | Platform registry, feature flags, all dispatched from tasks.py |
| Verdict engine (5 labels, 1–10 score) | ✅ Live | 100% accuracy on test set |
| Matching engine V2 (rapidfuzz) | ✅ Built | services/matching.py + run_matching_engine_job in scheduler |
| Match groups model + migration | ✅ Built | match_group.py, alembic migration exists |
| All 9 routers | ✅ Built | products, alerts, auth, compare, ai, coupons, payments, admin, tracking |
| APScheduler (all jobs including matching + digest) | ✅ Built | Daily digest, 6-platform scrapes, alert checks, backfill, coupon refresh |
| Wayback backfill + sitemap harvester | ✅ Built | |
| Email alerts (Resend) | ✅ Built | |
| Deals pagination + platform filter fix | ✅ Built | Backend /deals offset + platform bug fixed; web Load More client component |
| Admin scraper health dashboard | ✅ Built | GET /admin/scrapers/health; web page auto-refreshes 60s |
| CSV export (price history + alerts) | ✅ Built | GET /products/{id}/price-history.csv + GET /alerts/export.csv |
| Telegram user price-drop alerts | ✅ Built | services/telegram.py send_price_drop_alert(); tasks.py _send_alert_notification wired; /alerts/telegram/link + /unlink endpoints; migration c4d5e6f7a8b9 |
| Supabase auth + rate limiting | ✅ Built | |
| Sentry + Telegram code | ✅ Built | Not configured — no DSN / bot token in .env |
| AI Product Lens | ⚠️ Mock | services/ai.py is keyword-based, NOT real Claude API |
| SSLCommerz payments | ⚠️ Mock | routers/payments.py is a stub, no real integration |
| Premium feature gating (limits.py) | ❌ Missing | No gating logic; subscription model missing |

### Chrome Extension — 85% done

| Component | Status |
|---|---|
| Daraz, Cartup, Rokomari, Pickaboo support | ✅ |
| Inline widget, popup, background service worker | ✅ |
| Chaldal + Othoba in manifest | ❌ Not added |
| Coupon auto-apply | ❌ Not built |
| Chrome Web Store submission | ❌ Pending |

### Web App — 75% done

| Component | Status |
|---|---|
| All routes scaffolded (product, compare, dashboard, deals, alerts, install, privacy, premium, admin) | ✅ |
| PriceChart.tsx, PriceAlertModal.tsx | ✅ |
| i18n scaffolded (next-intl, en + bn) | ✅ |
| Vercel deployment config | ✅ |
| Bengali string translations | ⚠️ Scaffolded, likely empty/placeholder |
| Web pages connected to real API with proper UX states | ⚠️ May need verification |
| Google Search Console + OG images per product | ❌ |

### Ops / Launch — 30% done

- Sentry SDK in code, Telegram service built — neither configured in `.env`
- No users, no Chrome Web Store listing, no social posts

---

## Engineering Principles

1. **Adapter pattern strictly enforced.** New platforms = one new file in `backend/app/scraper/`. Verdict, alerts, alternatives, coupons stay platform-agnostic.
2. **Feature-flag everything.** New platforms hidden until QA passes 50 manual SKU samples. Cross-platform compare hidden until match-confidence ≥ 0.82 across ≥ 95% of test pairs.
3. **Append-only price history.** Never `UPDATE` a `price_snapshot`. Source-tag (`live` / `wayback`) for diagnostics.
4. **Status pills in PR descriptions.** Every PR title prefixed with `[Live|Building|Phase 2|Phase 3]` matching PRD section.
5. **No silent failures.** Every scraper failure, verdict mismatch, or auto-apply error pages Telegram. Sentry receives the structured trace.
6. **Test the scraper, not the verdict.** Verdict logic is mathematically deterministic (already 100% accurate on test SKUs). Scraper extraction is fragile and changes — that's where unit + integration tests pay back.
7. **Public-data-only.** No login bypass, no auth tokens, no auto-checkout without explicit user opt-in.

---

## Phase 0 — Launch Activation (Days 1–7, ~15 hours)

Everything here is non-code or config-only. **Nothing ships to users until this is done.**

| # | Task | File / Action | Done When |
|---|---|---|---|
| 0.1 | **Configure Sentry** | `backend/.env` → `SENTRY_DSN=...` | Errors appear in Sentry dashboard on test throw |
| 0.2 | **Configure Telegram bot** | `backend/.env` → `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Test digest message arrives in group |
| 0.3 | **Write privacy policy** | `web/src/app/[locale]/privacy/page.tsx` | Published at `damkoi.xynly.com/privacy`; covers anon_id, emails, prices |
| 0.4 | **Professional icons** | `extension/icons/` | 16×16, 48×48, 128×128 PNG from DK logo |
| 0.5 | **Submit extension to Chrome Web Store** | ZIP of `extension/dist/` | Item submitted; pending review |
| 0.6 | **Confirm production is live** | Render + Vercel dashboards | `api.damkoi.com/health` → 200; `damkoi.xynly.com` loads |
| 0.7 | **Post first 3 Facebook + 1 Telegram** | `SOFT_LAUNCH_CONTENT.md` templates | Posts live in Daraz Deals BD + 2 uni groups |

**Phase 0 done when:** Extension is pending Chrome Web Store review, production is live and monitored, and first marketing posts are up.

---

## Phase 1 — Web Polish + Extension Expansion (Days 8–30, ~65 hours)

**Goal:** Every web page works with real data, extension covers all 6 platforms, SEO starts compounding.

### Track C — Web Pages with Real Data

The routes exist but need real API wiring, proper loading/error/empty states, and UX polish.

#### C.1 — Homepage paste flow (~8h)

**Files:** [web/src/app/\[locale\]/page.tsx](web/src/app/%5Blocale%5D/page.tsx) + new `UrlPasteHero.tsx`

**Behavior:** Paste URL → call `POST /v1/products/lookup` → redirect to `/product/[id]`; loading skeleton during fetch; error state for unsupported URL.

**Acceptance:** Works for all 6 platform URLs; sub-2s redirect.

#### C.2 — Product page `/product/[id]` (~12h)

**Files:** [web/src/app/\[locale\]/product/\[id\]/page.tsx](web/src/app/%5Blocale%5D/product/%5Bid%5D/page.tsx)

Server-rendered (RSC) for SEO; render verdict card, 90-day chart, alternatives, coupons panel, "Set Alert" button wired to `PriceAlertModal`.

Page title: `{Product Title} – Price History Bangladesh | DamKoi`

**Acceptance:** Google can crawl it; OG preview shows verdict + price; alert creation works end-to-end.

#### C.3 — Dashboard `/dashboard` (~10h)

Shows tracked products with live verdicts + alerts list with edit/pause/delete. Anon users: read-only tracked list + "Sign in for more" CTA.

**Acceptance:** Logged-in user sees all data; free-tier cap (3 alerts) enforced with upgrade CTA.

#### C.4 — Deals feed `/deals` (~8h)

Filterable by platform, category, `deal_score`; URL-driven filter state (shareable). Pagination (50/page); server-rendered for SEO.

**Acceptance:** Filter by `platform=daraz&min_score=8` returns correct results.

#### C.5 — Alerts page `/alerts` (~6h)

Full CRUD: create, pause, resume, delete. Channel selector (email only for now); target price validation.

**Acceptance:** All CRUD operations reflect instantly without page reload.

#### C.6 — SEO foundation (~8h)

**Files:** [web/src/app/sitemap.ts](web/src/app/sitemap.ts), [web/src/app/robots.ts](web/src/app/robots.ts), new `web/src/app/product/[id]/opengraph-image.tsx`

Dynamic OG image per product: renders verdict label + current price as PNG. Submit `damkoi.xynly.com/sitemap.xml` to Google Search Console.

**Acceptance:** Search Console shows sitemap accepted; product page OG card shows in link preview.

**Track C Phase 1 total: ~52h**

---

### Track A — Extension Expansion

#### A.1 — Add Chaldal + Othoba to extension (~6h)

**Files:** [extension/manifest.json](extension/manifest.json), [extension/content.js](extension/content.js)

Add `content_scripts.matches` entries and `host_permissions` for both platforms. Add platform extractors in `content.js` (hostname dispatch already exists for 4 platforms — extend same pattern).

**Acceptance:** Visiting a Chaldal product page fires the inline widget; verdict loads.

#### A.2 — Chrome Web Store multi-platform update (~3h)

Update store listing screenshots and description to show all 6 platforms. Resubmit.

**Track A Phase 1 total: ~9h**

---

### Track H — Ops Phase 1

#### H.1 — Bengali verdict labels (~4h)

**File:** [backend/app/services/verdict.py](backend/app/services/verdict.py)

Add `lang: str = "en"` param; return BN display strings when `lang="bn"`. Wire through `/products/lookup` endpoint via `Accept-Language` header.

```
FAKE_DISCOUNT  → "❌ ভুয়া ছাড়"
BEST_PRICE     → "✅ সর্বনিম্ন দাম"
GOOD_DEAL      → "🔥 ভাল ডিল"
FAIR_PRICE     → "🟡 স্বাভাবিক দাম"
INSUFFICIENT_DATA → "⏳ তথ্য সংগ্রহ হচ্ছে"
```

**Acceptance:** API returns `"❌ ভুয়া ছাড়"` when called with `Accept-Language: bn`.

**Track H Phase 1 total: ~4h**

---

### Phase 1 — Done Bar (Day 30)

- [ ] All 6 web routes render real API data with loading/error/empty states
- [ ] Extension covers all 6 platforms (manifest + manual smoke test passes)
- [ ] Google Search Console shows sitemap accepted
- [ ] Chrome Web Store approved; 500+ installs
- [ ] Bengali verdict labels returned by API
- [ ] Matching engine has created match groups for ≥ 20% of multi-platform products
- [ ] Telegram daily digest running at 8am BD
- [ ] Sentry capturing errors with per-platform tags

---

## Phase 2 — Cross-Platform + Coupon Auto-Apply (Days 31–60, ~80 hours)

**Goal:** The two highest-value unreleased features ship — users see cross-platform savings and auto-save at checkout.

### Track B — Cross-Platform Compare End-to-End

The backend is built (matching engine, `/compare` endpoint, admin router). Verify it works then build the UI.

#### B.1 — Verify + test matching engine (~8h)

Run `cluster_ungrouped_products()` on production data; check match group count in DB. Build 50-pair labeled test set; verify precision > 0.95 at 0.82 threshold.

**File:** [backend/app/services/matching.py](backend/app/services/matching.py) — tune if needed.

#### B.2 — Web compare page (~10h)

**Files:** [web/src/app/\[locale\]/compare/\[slug\]/page.tsx](web/src/app/%5Blocale%5D/compare/%5Bslug%5D/page.tsx) + new `CompareGrid.tsx`

Side-by-side card grid sorted by price; match confidence chip; "Report wrong match" button → `POST /compare/{id}/report`.

**Acceptance:** Product with 3+ platform matches shows all cards; <1s load (Redis-cached).

#### B.3 — Extension cross-platform panel (~8h)

**Files:** [extension/popup.js](extension/popup.js) + [extension/popup.html](extension/popup.html)

Add compare section: top 3 matches from `/compare/{id}`, each showing platform, price, delta. Gracefully hidden when no matches exist.

**Acceptance:** Samsung Galaxy on Daraz shows Pickaboo + Cartup prices in popup.

**Track B Phase 2 total: ~26h**

---

### Track D — Coupon Auto-Apply (NEW BUILD)

This is the largest Phase 2 item and doesn't exist yet.

#### D.1 — Cart-page detection (~6h)

**New file:** `extension/cart_detector.js`

Detects Daraz checkout pages by URL pattern (`/checkout/`) + DOM signature (cart total element).

**Files to modify:** [extension/manifest.json](extension/manifest.json) (add `*://www.daraz.com.bd/checkout/*`), [extension/content.js](extension/content.js)

**Acceptance:** Detector fires within 500ms on Daraz cart page with 99% reliability.

#### D.2 — Coupon injection logic (~14h)

**New file:** `extension/coupon_injector.js`

Logic: detect coupon input → `GET /coupons/daraz?cart_total={total}` → try top code → observe DOM for success/failure indicator → retry up to 3 → show toast "✓ Saved ৳X with CODE" on success.

Failure fallback: silent → shows copy button, no error to user.

**Acceptance:** 3 successful end-to-end auto-applies on Daraz carts in manual QA.

#### D.3 — User opt-in modal (~6h)

**Files:** [extension/popup.js](extension/popup.js) + new `extension/storage.js`

First-time Daraz checkout visit: "Auto-apply best coupon at checkout? [Yes / No / Ask each time]". Preference stored in `chrome.storage.local`; changeable in extension settings.

**Acceptance:** Opt-in fires exactly once; preference persists across sessions.

#### D.4 — Backend telemetry (~6h)

**New migration:** `backend/alembic/versions/xxx_add_coupon_applications.py`

```sql
CREATE TABLE coupon_applications (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID,
    anon_id         VARCHAR(255),
    platform        VARCHAR(50) NOT NULL,
    coupon_code     VARCHAR(255),
    cart_total      INTEGER,
    savings         INTEGER,
    success         BOOLEAN NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**New router:** `backend/app/routers/telemetry.py` — `POST` endpoint to log `{platform, code, cart_total, savings, success}`.

Add to daily Telegram digest: total auto-applies + savings today.

**Acceptance:** Each coupon attempt (success or fail) logs one row; shows in digest.

**Track D Phase 2 total: ~32h**

---

### Track F — Bengali UI Translations

#### F.1 — Translate top 200 strings (~12h)

**File:** `web/messages/bn.json` (likely empty — fill it)

Covers: homepage hero, product page verdict labels, dashboard, alert forms, deals feed.

**Acceptance:** Toggle in header switches all visible text to Bengali; no English fallbacks visible on main flows.

**Track F Phase 2 total: ~12h**

---

### Track H — Ops Phase 2 (~4h)

Add to daily Telegram digest: coupon auto-apply error rate alert (>20% in 1h) + match group coverage % (products with ≥1 cross-platform match).

---

### Phase 2 — Done Bar (Day 60)

- [ ] Cross-platform compare works for ≥ 50% of products with 3+ platform coverage
- [ ] Extension popup shows cross-platform savings panel
- [ ] Coupon auto-apply fires on Daraz checkout (3+ manual test passes; 80% cart-page success rate)
- [ ] User opt-in modal works; preference persisted
- [ ] Bengali UI toggle works end-to-end; top 200 strings translated
- [ ] Coupon telemetry table logging every attempt; showing in daily digest
- [ ] 2,000+ extension installs; 3,000+ active alerts

---

## Phase 3 — Premium Tier + Real AI (Days 61–90, ~90 hours)

**Goal:** DamKoi has paying users and real AI-powered product summaries.

### Track E — Premium Tier (Real Payments)

#### E.1 — Subscription model (~8h)

**New file:** `backend/app/models/subscription.py`

```python
class Subscription(Base):
    __tablename__ = "subscriptions"
    id           = Column(UUID, primary_key=True, default=uuid4)
    user_id      = Column(UUID, ForeignKey("users.id"), nullable=False)
    plan         = Column(String(50), default="premium")   # 'free' | 'premium'
    status       = Column(String(50), default="active")    # 'active' | 'cancelled' | 'expired'
    started_at   = Column(TIMESTAMPTZ, default=now)
    ends_at      = Column(TIMESTAMPTZ)
    provider     = Column(String(50))   # 'sslcommerz' | 'bkash' | 'manual'
    provider_ref = Column(String(255))
```

**New migration:** `backend/alembic/versions/xxx_add_subscriptions.py`

**Acceptance:** Migration applies cleanly; model importable.

#### E.2 — SSLCommerz real integration (~14h)

Replace mock in [backend/app/routers/payments.py](backend/app/routers/payments.py). Add `sslcommerz-lib` to [backend/requirements.txt](backend/requirements.txt). IPN webhook → set subscription active within 30s of payment.

**New web page:** `web/src/app/[locale]/upgrade/page.tsx` + `CheckoutFlow.tsx`

**Acceptance:** Sandbox purchase end-to-end works; one real ৳199 smoke test.

#### E.3 — Premium feature gating (~10h)

**New file:** `backend/app/services/limits.py` — `check_alert_limit(user)`, `check_history_depth(user)`

Wire into: [backend/app/routers/alerts.py](backend/app/routers/alerts.py) (3-alert cap for free), [backend/app/routers/products.py](backend/app/routers/products.py) (90-day cap on history for free).

**New component:** `web/src/components/PaywallModal.tsx` — shown when free limit hit.

**Acceptance:** Free user hitting 3rd alert sees paywall → checkout → returns as premium with unlimited alerts.

#### E.4 — bKash integration (~8h + ~14 days KYC — start application Day 61)

Parallel path alongside SSLCommerz; bKash merchant application takes 2+ weeks so submit immediately.

**Code:** Add bKash payment method to `CheckoutFlow.tsx` and `billing.py`.

**Track E Phase 3 total: ~40h**

---

### Track G — Real Product Lens (Claude API)

#### G.1 — Replace mock AI (~12h)

**File:** [backend/app/services/ai.py](backend/app/services/ai.py) — replace keyword logic with real Anthropic API call.

Add `anthropic>=0.40` to [backend/requirements.txt](backend/requirements.txt). Add `ANTHROPIC_API_KEY` to `render.yaml` + `.env`.

**Model:** `claude-haiku-4-5-20251001` (cheapest, fast)

**Prompt:** System prompt reviewing product title + reviews, returning `{pros[], cons[], verdict, buyer_fit}` — Bengali-aware.

**Caching:** `ProductLens` table (TTL 7 days).

**Acceptance:** Top 100 Daraz products get real summaries; 16/20 manually rated "useful"; cost <$0.05/product.

#### G.2 — Review extraction (~10h)

**New file:** `backend/app/scraper/reviews_extractor.py`

Extract top 20 reviews from Daraz product page (Playwright already running — reuse).

**Acceptance:** 80%+ of top-100 products yield ≥5 reviews for LLM input.

#### G.3 — Product Lens DB model + table (~4h)

**New file:** `backend/app/models/product_lens.py`
**New migration:** `backend/alembic/versions/xxx_add_product_lens.py`

#### G.4 — Product Lens UI (~8h)

**File:** [web/src/app/\[locale\]/product/\[id\]/page.tsx](web/src/app/%5Blocale%5D/product/%5Bid%5D/page.tsx)

Add `ProductLensCard` below verdict: pros/cons list + verdict text + "AI-generated · refreshed weekly" disclaimer. Free: teaser (1 line); Premium: full summary.

**Acceptance:** Card renders on product page; paywall gates full view.

**Track G Phase 3 total: ~34h**

---

### Track D — Auto-Apply Expansion

#### D.5 — Pickaboo auto-apply (~10h)

Extend [extension/coupon_injector.js](extension/coupon_injector.js) for Pickaboo checkout DOM. Update [extension/manifest.json](extension/manifest.json) with Pickaboo checkout matchers.

**Acceptance:** Auto-apply fires on Pickaboo checkout with same opt-in gate as Daraz; 3 manual QA passes.

**Track D Phase 3 total: ~10h**

---

### Track H — Load Testing + Monitoring Polish

#### H.1 — Load test (~6h)

k6 script against `api.damkoi.com`. Targets: 100 concurrent on `/products/lookup` → p95 <2s; 500 concurrent on `/deals` → p95 <500ms (Redis-cached).

**Acceptance:** Both targets met; any bottleneck documented in `docs/load_test_day85.md`.

#### H.2 — Scraper health admin view (~8h)

**New page:** `web/src/app/admin/scrapers/page.tsx`

Per-platform: last scrape time, success rate (today), last error, queue depth. Auth-gated; not in nav.

**Track H Phase 3 total: ~14h**

---

### Phase 3 — Done Bar (Day 90)

- [ ] ≥ 100 paying premium subscribers
- [ ] Product Lens live for top 100 Daraz products (real Claude, not mock)
- [ ] Premium feature gating enforced: 3-alert cap for free, unlimited for premium
- [ ] SSLCommerz checkout works end-to-end; one real ৳199 production purchase confirmed
- [ ] Auto-apply working on Daraz + Pickaboo; safety guardrails in place
- [ ] 5,000+ extension installs; 15,000 web MAU
- [ ] 8,000 active alerts
- [ ] Load tests pass on both endpoints (p95 targets met)
- [ ] Verdict accuracy ≥ 95% on per-platform 50-SKU manual sample

---

## Open Technical Gaps to Resolve Before Phase 2

1. **`cluster_ungrouped_products` in `services/matching.py`** — verify this function actually exists and is being called successfully by the scheduler
2. **Bengali translations in `web/messages/bn.json`** — check if the file has real content or empty placeholders before announcing Bengali UI
3. **`Product.last_backfilled_at` column** — `tasks.py` references it in the backfill query; confirm the Alembic migration adds this column
4. **Web pages real data** — visit each route on the deployed site and confirm they render real API data, not static/placeholder content
5. **CORS for `damkoi.xynly.com`** — confirm `render.yaml` `CORS_ORIGINS` includes the production web URL

---

## Database Migrations Order

```
001 — initial_schema                        (done)
002 — add_coupons_table                     (done)
003 — add_matchgroup_model                  (done)
004 — add_coupon_applications_table         (Phase 2 — Track D)
005 — add_telegram_chat_id_to_users         (done — c4d5e6f7a8b9)
006 — add_subscriptions_table               (Phase 3 — Track E)
007 — add_product_lens_table                (Phase 3 — Track G)
```

Apply migrations idempotently. Never drop columns; never rename in a single migration (use a deprecation cycle).

---

## Testing Strategy

| Layer | Tool | Coverage Target | Where |
|---|---|---|---|
| Scraper unit | pytest + fixtures | 80% per platform extractor | `backend/tests/scraper/` |
| Scraper integration | pytest + live URLs (run monthly) | 50 SKUs per platform | `backend/tests/integration/` |
| API endpoints | pytest + httpx TestClient | 100% of routes | `backend/tests/routers/` |
| Verdict logic | pytest | 100% (already 8/8 in `qa_test_results.json`) | `backend/tests/services/test_verdict.py` |
| Matching engine | pytest + labeled set | precision > 0.95 at threshold 0.82 | `backend/tests/services/test_matcher.py` |
| Web | Playwright | Homepage paste, product page, alert create | `web/tests/e2e/` |
| Extension | Manual | Popup loads, verdict shows, alert creates (all 6 platforms) | Manual QA doc |
| CI | GitHub Actions | Backend + web on every PR | `.github/workflows/ci.yml` |

---

## Monitoring & Alerting

| Signal | Channel | Threshold |
|---|---|---|
| Scraper failure rate per platform | Telegram + Sentry | > 30% in 1h |
| API 5xx rate | Sentry | > 1% in 5min |
| API p95 latency | Sentry | > 3s in 5min |
| Coupon auto-apply error rate | Telegram | > 20% in 1h |
| Daily metrics digest | Telegram | 8am BD daily |
| New install milestone | Telegram | every 100 / 500 / 1,000 / 5,000 |
| Premium subscription event | Telegram | every event |
| Match group coverage | Telegram (digest) | < 10% cross-platform coverage is a warning |

---

## Security & Legal Checklist

- [ ] **Public-data-only** scraping. No login, no auth tokens, no cart manipulation.
- [ ] **Auto-apply requires opt-in.** First-run modal; never default-on.
- [ ] **Per-platform legal review** before each new scraper goes live (~৳25K per review via BD lawyer).
- [ ] **Privacy policy** updated for: anon_id, telemetry, AI processing of reviews.
- [ ] **Affiliate disclosure** clearly visible where used.
- [ ] **No PII in Sentry breadcrumbs.** Strip emails, names, anon_ids before sending.
- [ ] **Robots.txt respected** by all scrapers (≤ 1 req/3s per platform).

---

## DevOps

| Resource | Tier | Phase 1 cost | Phase 3 cost |
|---|---|---|---|
| Render (FastAPI) | Starter $7/mo | $7 | $25 (upgrade if 5K MAU) |
| Render Postgres | Starter $7/mo | $7 | $20 (10GB at 5K products) |
| Render Redis | Starter $10/mo | $10 | $10 |
| Vercel (web) | Free → Pro $20/mo | $0 | $20 |
| Supabase | Free | $0 | $25 (Pro at 50K MAU) |
| Resend | Free 100/day | $0 | $20 (Pro at 1K alerts/day) |
| Sentry | Free 5K events/mo | $0 | $26 (Team) |
| Anthropic API | Pay-per-use | $0 | ~$50/mo (top 100 products weekly) |
| BrightData proxies | Pay-per-GB | $0 | $50–200 (if needed) |
| **Total monthly** | | **~$24** | **~$246–396** |

---

## Critical Path Summary

```
Phase 0: Configure ops (Sentry, Telegram, privacy) → Chrome Web Store submit → First posts
       ↓
Phase 1: Web real data + SEO + Extension 6-platform → 500 installs
       ↓
Phase 2: Verify matching → Compare UI → Coupon auto-apply build → Bengali UI
       ↓
Phase 3: SSLCommerz real + subscription gating → Real Claude AI → Pickaboo auto-apply
```

**The single most important near-term task:** Finish Phase 0 — the entire product is built and functional but zero users can access it.

**The single most impactful engineering task coming up:** Coupon auto-apply (D.1–D.4) — it's the #3 "aha moment" in the PRD, not yet started, and it drives both retention and word-of-mouth.

---

## Dependency Graph

```
[Phase 0] Ops config + Chrome Web Store
       │
       └─► [Phase 1: Track C] Web real data ──► SEO compounding (months-long)
       │
       └─► [Phase 1: Track A] Extension 6 platforms ──► CWS multi-platform update
       │
       └─► [Phase 1: Track H] Bengali verdict labels
       │
       └─► [Phase 2: Track B] Verify matching ──► Compare UI ──► Extension panel
       │
       └─► [Phase 2: Track D] Daraz auto-apply ──► [Phase 3: Pickaboo auto-apply]
       │
       └─► [Phase 2: Track F] Bengali UI translations
       │
       └─► [Phase 3: Track E] SSLCommerz + subscription model + gating
       │                              │
       │                              └─► [Phase 3: Track G] Product Lens (premium-gated)
       │
       └─► [Phase 3: Track H] Load test + scraper health dashboard
```

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Daraz blocks scraper aggressively | Medium | High | Stealth + UA rotation already in place; BrightData proxies as fallback |
| Match-engine false positive rate > 10% | Medium | High | Bump threshold to 0.85; admin merge tool already built; defer compare on low-confidence pairs |
| SSLCommerz integration delays | Medium | Medium | Manual bKash invoicing for first 50 premium subs as fallback |
| bKash KYC takes > 30 days | High | Low | SSLCommerz primary; bKash Phase 2 fallback |
| `cluster_ungrouped_products` not working | Medium | High | Audit in Phase 1 B.1; fix before Phase 2 compare UI ships |
| Coupon injection breaks Daraz cart | Medium | High | Defensive rollback in D.2; always test on sandbox/test cart before production |
| Anthropic API cost exceeds budget | Low | Medium | Use Haiku-only; cache 7 days; batch processing |
| Web SEO slow to compound | High | Low | Expected; SEO is months-long; keep publishing product pages |
| Render free tier hits memory limits | Medium | Medium | Upgrade to Starter+ at first 5xx spike (~$50/mo increase) |

---

## Communication & Cadence

- **Daily:** Telegram digest auto-posts at 8am BD
- **Weekly (Friday):** Founder review of metrics + roadmap progress (~2h)
- **Bi-weekly:** Public update on Telegram channel + LinkedIn (build-in-public)
- **Monthly:** Per-platform verdict-accuracy audit (manual 50-SKU sample per platform)

---

## How to Use This Plan

1. **Read alongside the PRD.** PRD = what + why. This = how + when.
2. **Status updates:** every Friday, mark task checkboxes as `[x]` and commit. This file is the source of truth for "what shipped."
3. **PR titles:** prefix with the task ID (e.g., `[C.2] Product page real data`).
4. **Out of scope?** Goes in `BACKLOG.md` — not started without revisiting this plan.
5. **Bend, don't break.** Reorder tasks within a phase if priorities shift. Don't slip phase boundaries without updating the done bars.

---

*Implementation Plan v3.0 — DamKoi 90-Day Expansion (Reality-Calibrated)*
*Updated 2026-05-02. Backend 95% done, Extension 85%, Web 75%, Ops 30%. Remaining work is Phase 0 activation, web data wiring, coupon auto-apply (unbuilt), and Phase 3 production features (real payments, real AI, premium gating).*
