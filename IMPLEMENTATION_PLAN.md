# DamKoi — 90-Day Implementation Plan
## Companion to PRD v3.0 (BuyHatke for Bangladesh)

**Version:** 3.1 (Reality-Calibrated — Audit 2026-05-07)
**Date:** 2026-05-07
**Owner:** Md. Jubair Hasan
**Plan horizon:** Days 1–90 (May–Aug 2026)
**Source PRD:** [PRD_DamKoi_v2.md](PRD_DamKoi_v2.md)

---

## What To Do Right Now — 2026-05-07

> Audited codebase. Backend 97%, Extension 97%, Web 92%, Ops 30%. The product is functionally complete. What's left is ops config, a few missing UI pieces, and Phase 3 groundwork.

### Priority 1 — Unblock Operations (30 min, no code)

Add these to Vercel project environment variables for the backend deployment:
- `SENTRY_DSN` — get from sentry.io (create a FastAPI project)
- `TELEGRAM_BOT_TOKEN` — from @BotFather
- `TELEGRAM_CHAT_ID` — your ops group chat ID

Local `backend/.env` is configured and smoke-tested as of 2026-05-14. Production is only covered once the same values exist in Vercel and a production Sentry event + Telegram test message succeed.

### Priority 2 — Verify Production Matching (1h, Supabase SQL Editor)

```sql
SELECT COUNT(*) FROM match_groups;
SELECT COUNT(*) FROM match_groups WHERE created_at > NOW() - INTERVAL '7 days';
```

If both are 0, verify `/cron/matching` is running successfully in Vercel. On Vercel/serverless, in-process APScheduler does not stay alive; non-browser jobs now run through authenticated `/cron/*` routes, while browser-based scraper batches still need a Playwright-capable worker/runtime.

### Priority 3 — SEO: OG Images for Product Pages (~4h)

**File to create:** `web/src/app/[locale]/product/[id]/opengraph-image.tsx`

Dynamic image showing: product title + verdict label + price. This is what appears when someone shares a DamKoi product link on Facebook — critical for viral loop via deal-sharing.

### Priority 4 — Extension: Cross-Platform Panel in Popup (~6h)

**File:** `extension/popup.js` — add compare section calling `/compare/{id}`, top 3 matches.

This is the #2 "aha moment" from the PRD: "৳3,200 cheaper on Pickaboo right now."

### Priority 5 — Manual QA: Coupon Auto-Apply on Daraz (~3h)

Load the extension locally, visit a Daraz cart page, confirm:
1. Opt-in modal fires
2. Coupon gets injected
3. Toast shows savings
4. Telemetry row logged

### Priority 6 — Bengali Verdict Labels in API (~2h)

**File:** `backend/app/services/verdict.py` — add `lang` param, return Bengali labels when `Accept-Language: bn`.

### Priority 7 — Phase 3 Groundwork: limits.py + subscription.py (~6h)

These two files are missing and block the entire premium tier:
- `backend/app/services/limits.py` — `check_alert_limit()`, `check_history_depth()`
- `backend/app/models/subscription.py` + Alembic migration

**Note:** Subscription is deferred (no payments yet), but `limits.py` alone can enforce the 3-alert free-tier cap with a simple in-code check — build that first.

---

> Last audited 2026-05-07. Files verified against actual codebase, not assumptions.

### Backend — 97% done

| Component | Status | Notes |
|---|---|---|
| All 6 scrapers (Daraz, Cartup, Rokomari, Pickaboo, Chaldal, Othoba) | ✅ Built | Platform registry, feature flags, all dispatched from tasks.py |
| Verdict engine (5 labels, 1–10 score) | ✅ Live | 100% accuracy on test set |
| Matching engine V2 (rapidfuzz) | ✅ Built | services/matching.py + `cluster_ungrouped_products()` confirmed at line 58 |
| Match groups model + migration | ✅ Built | match_group.py, alembic migration exists |
| All 10 routers | ✅ Built | products, alerts, auth, compare, ai, coupons, payments, admin, tracking, telemetry |
| Scheduled jobs | ⚠️ Wired for Vercel Cron | `/cron/*` routes + `backend/vercel.json` schedules exist for alerts, coupons, matching, digest, backfill, cleanup; browser-based scraper batches still need a Playwright-capable worker/runtime |
| Wayback backfill + sitemap harvester | ✅ Built | |
| Email alerts (Resend) | ✅ Built | |
| Deals pagination + platform filter fix | ✅ Built | Backend /deals offset + platform bug fixed; web Load More client component |
| Admin scraper health dashboard | ✅ Built | GET /admin/scrapers/health; web page auto-refreshes 60s |
| CSV export (price history + alerts) | ✅ Built | GET /products/{id}/price-history.csv + GET /alerts/export.csv |
| Telegram user price-drop alerts | ✅ Built | services/telegram.py `send_price_drop_alert()` confirmed; tasks.py wired; /alerts/telegram/link + /unlink live; migration c4d5e6f7a8b9 |
| Coupon telemetry | ✅ Built | routers/telemetry.py + models/coupon_application.py confirmed |
| Supabase auth + rate limiting | ✅ Built | |
| Sentry + Telegram code | ✅ Built | **NOT CONFIGURED** — no DSN / bot token in .env (Phase 0 blocker) |
| AI Product Lens | ⚠️ Mock | services/ai.py is keyword-based — **deferred: no AI until revenue** |
| SSLCommerz payments | ⚠️ Mock | routers/payments.py is a stub — Phase 3 |
| Premium feature gating | ❌ Missing | `backend/app/services/limits.py` does not exist; `models/subscription.py` does not exist |

### Chrome Extension — 97% done

| Component | Status |
|---|---|
| Daraz, Cartup, Rokomari, Pickaboo support | ✅ |
| Inline widget, popup, background service worker | ✅ |
| Chaldal + Othoba in manifest | ✅ Confirmed in manifest.json |
| Daraz checkout detection (cart_detector.js) | ✅ Confirmed — file exists, bundles in manifest |
| Coupon auto-apply (coupon_injector.js) | ✅ Confirmed — file exists with retry logic |
| User opt-in modal (storage.js) | ✅ Confirmed — storage.js exists |
| Chrome Web Store submission | ❌ Pending — deferred until local testing complete |

### Web App — 92% done

| Component | Status |
|---|---|
| All routes scaffolded (product, compare, dashboard, deals, alerts, install, privacy, premium, admin) | ✅ |
| PriceChart.tsx, PriceAlertModal.tsx | ✅ |
| i18n scaffolded (next-intl, en + bn) | ✅ |
| Vercel deployment config | ✅ |
| Bengali string translations | ✅ Fully populated — 100+ strings confirmed in web/messages/bn.json |
| Homepage URL paste flow (HeroSection.tsx) | ✅ Built — calls POST /products/lookup, redirects to /product/[id], handles error states |
| Product page /product/[id] | ✅ Server-rendered RSC, real API, verdict + chart + coupons wired |
| Dashboard page | ✅ Client component, calls real API for alerts + tracked products |
| Alerts page | ✅ Full CRUD: create, pause, delete — calls real API |
| Compare page /compare/[slug] | ✅ Server-rendered, calls /compare/{id} API, shows per-platform cards |
| Privacy policy | ✅ Real content — covers anon_id, email, scraping, contact |
| Sitemap generator | ✅ web/src/app/sitemap.ts — fetches product IDs from API |
| Robots.txt | ✅ web/src/app/robots.ts — allows /, disallows /api/ |
| OG image per product page | ❌ Not built — needed for social sharing + SEO |
| Google Search Console submission | ❌ Not done |

### Ops / Launch — 30% done

- Sentry SDK in code, Telegram service built — **neither configured in `.env`** (this is the only Phase 0 blocker)
- Privacy policy live at damkoi.xynly.com/privacy ✅
- No Chrome Web Store listing yet (deferred pending local testing)
- No social posts yet

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

| # | Task | File / Action | Done When | Status |
|---|---|---|---|---|
| 0.1 | **Configure Sentry** | `backend/.env` + Vercel env → `SENTRY_DSN=...` | Errors appear in Sentry dashboard on test throw | ⚠️ Local verified; confirm Vercel env |
| 0.2 | **Configure Telegram bot** | `backend/.env` + Vercel env → `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Test digest message arrives in group | ⚠️ Local verified; confirm Vercel env |
| 0.3 | **Write privacy policy** | `web/src/app/[locale]/privacy/page.tsx` | Published at `damkoi.xynly.com/privacy`; covers anon_id, emails, prices | ✅ Done |
| 0.4 | **Professional icons** | `extension/icons/` | 16×16, 48×48, 128×128 PNG from DK logo | ⚠️ Verify PNGs exist |
| 0.5 | **Submit extension to Chrome Web Store** | ZIP of `extension/dist/` | Item submitted; pending review | ❌ Deferred (local testing first) |
| 0.6 | **Confirm production is live** | Vercel + Supabase dashboards | `api.damkoi.com/health` → 200; `damkoi.xynly.com` loads | ✅ Done (deployed 2026-05-07) |
| 0.7 | **Post first 3 Facebook + 1 Telegram** | `SOFT_LAUNCH_CONTENT.md` templates | Posts live in Daraz Deals BD + 2 uni groups | ❌ Not started |

**Phase 0 blocker:** Local Sentry and Telegram config is verified. Confirm the same `SENTRY_DSN`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` exist in Vercel, then verify a production Sentry event and Telegram message.

---

## Phase 1 — Web Polish + Extension Expansion (Days 8–30)

**Goal:** Every web page works with real data, extension covers all 6 platforms, SEO starts compounding.

> **2026-05-07 audit:** Phase 1 is ~95% complete. Most tasks are done. Remaining: SEO OG images + GSC submission. Bengali verdict labels not yet confirmed in API.

### Track C — Web Pages with Real Data ✅ DONE

#### C.1 — Homepage paste flow — ✅ DONE
HeroSection.tsx built; calls `POST /products/lookup`; redirects to `/product/[id]`; loading/error states implemented.

#### C.2 — Product page `/product/[id]` — ✅ DONE
Server-rendered RSC; verdict, chart, coupons, alternatives wired to real API.

#### C.3 — Dashboard `/dashboard` — ✅ DONE
Client component; real API calls for tracked products + alerts; CRUD working.

#### C.4 — Deals feed `/deals` — ✅ DONE
Filterable by platform/category/score; Load More pagination; server-rendered first page.

#### C.5 — Alerts page `/alerts` — ✅ DONE
Full CRUD: create, pause, delete. Calls real API. No page reload needed.

#### C.6 — Compare page `/compare/[slug]` — ✅ DONE
Server-rendered; per-platform cards sorted by price; match confidence shown; "Report wrong match" button included.

#### C.7 — SEO foundation — ⚠️ PARTIAL

**Done:**
- [web/src/app/sitemap.ts](web/src/app/sitemap.ts) — generates dynamic sitemap from API product IDs ✅
- [web/src/app/robots.ts](web/src/app/robots.ts) — correctly configured ✅

**Remaining (~4h):**
- `web/src/app/[locale]/product/[id]/opengraph-image.tsx` — dynamic OG image with verdict + price (needed for FB/TG sharing)
- Submit `damkoi.xynly.com/sitemap.xml` to Google Search Console

**Acceptance:** GSC shows sitemap accepted; product OG card previews correctly when shared on Facebook.

---

### Track A — Extension Expansion ✅ DONE

#### A.1 — Chaldal + Othoba in manifest — ✅ DONE
Confirmed in manifest.json: all 6 platforms in `content_scripts.matches` and `host_permissions`.

#### A.2 — Chrome Web Store submission — ❌ DEFERRED
User decision: test locally first, submit to CWS later.

---

### Track H — Ops Phase 1

#### H.1 — Bengali verdict labels — ❌ TODO (~2h)

**File:** [backend/app/services/verdict.py](backend/app/services/verdict.py)

Add `lang: str = "en"` param; return BN display strings when `lang="bn"`. Wire through `/products/lookup` via `Accept-Language` header.

```
FAKE_DISCOUNT     → "❌ ভুয়া ছাড়"
BEST_PRICE        → "✅ সর্বনিম্ন দাম"
GOOD_DEAL         → "🔥 ভাল ডিল"
FAIR_PRICE        → "🟡 স্বাভাবিক দাম"
INSUFFICIENT_DATA → "⏳ তথ্য সংগ্রহ হচ্ছে"
```

**Acceptance:** API returns Bengali label when called with `Accept-Language: bn`.

---

### Phase 1 — Done Bar

- [x] All 6 web routes render real API data with loading/error/empty states
- [x] Extension covers all 6 platforms
- [ ] Google Search Console shows sitemap accepted — **pending OG images + GSC submission**
- [ ] Chrome Web Store approved — **deferred (user decision)**
- [ ] Bengali verdict labels returned by API — **pending H.1**
- [ ] Matching engine has created match groups for ≥ 20% of multi-platform products — **needs production DB verification**
- [ ] Telegram daily digest running at 8am BD — **blocked on Phase 0 env config**
- [ ] Sentry capturing errors with per-platform tags — **blocked on Phase 0 env config**

---

## Phase 2 — Cross-Platform + Coupon Auto-Apply (Days 31–60)

**Goal:** The two highest-value unreleased features ship — users see cross-platform savings and auto-save at checkout.

> **2026-05-07 audit:** Phase 2 is ~80% complete. Compare page live. Auto-apply code built. Remaining: B.1 production DB verification, B.3 extension panel, D.5 manual QA.

### Track B — Cross-Platform Compare End-to-End

#### B.1 — Verify matching engine on production data — ❌ TODO (~4h)

`cluster_ungrouped_products()` confirmed at [backend/app/services/matching.py](backend/app/services/matching.py) line 58. Run it against production DB; verify match groups exist.

Check: `SELECT COUNT(*) FROM match_groups;` via Supabase SQL Editor. If 0, trigger `/cron/matching` and inspect Vercel logs; the cron route is wired but still depends on `CRON_SECRET` and production DB access.

**Acceptance:** ≥ 100 match groups in production; `/compare/{id}` returns real data for a multi-platform product.

#### B.2 — Web compare page — ✅ DONE
[web/src/app/\[locale\]/compare/\[slug\]/page.tsx](web/src/app/%5Blocale%5D/compare/%5Bslug%5D/page.tsx) is server-rendered, real API, per-platform cards with confidence chip + "Report wrong match".

#### B.3 — Extension cross-platform panel — ❌ TODO (~6h)

**Files:** [extension/popup.js](extension/popup.js) + [extension/popup.html](extension/popup.html)

Add compare section: top 3 matches from `/compare/{id}`, each showing platform, price, delta. Gracefully hidden when no matches exist.

**Acceptance:** Samsung Galaxy on Daraz shows Pickaboo + Cartup prices in popup.

---

### Track D — Coupon Auto-Apply

> **2026-05-07 audit:** All code built. Needs manual end-to-end QA only.

#### D.1 — Cart-page detection — ✅ DONE
`extension/cart_detector.js` exists; Daraz checkout matches in manifest confirmed.

#### D.2 — Coupon injection logic — ✅ DONE
`extension/coupon_injector.js` exists with retry (up to 3), toast on success, copy-button fallback.

#### D.3 — User opt-in modal — ✅ DONE (verify)
`extension/storage.js` exists. **Verify:** first Daraz checkout triggers opt-in once; preference persists.

#### D.4 — Backend telemetry — ✅ DONE
`routers/telemetry.py` + `models/coupon_application.py` confirmed.

#### D.5 — Manual QA on Daraz — ❌ TODO (~3h)
Load extension locally, visit Daraz cart, confirm: opt-in fires, coupon injected, toast shows savings, telemetry row logged.

**Acceptance:** 3 successful end-to-end auto-apply passes on real Daraz checkout.

---

### Track F — Bengali UI Translations — ✅ DONE
`web/messages/bn.json` confirmed: 100+ strings fully translated. Toggle switches all visible text to Bengali.

---

### Track H — Ops Phase 2 (~2h)

Add coupon auto-apply error rate alert (>20% in 1h) + match group coverage % to daily Telegram digest. **Blocked on Phase 0 Telegram config.**

---

### Phase 2 — Done Bar

- [x] Web compare page built and live
- [x] Coupon auto-apply code built (D.1–D.4)
- [x] Bengali UI fully translated
- [x] Coupon telemetry table and router exist
- [ ] Matching engine verified on production DB — **B.1 pending**
- [ ] Extension popup shows cross-platform panel — **B.3 pending (~6h)**
- [ ] Coupon auto-apply manual QA passes — **D.5 pending (~3h)**
- [ ] Ops digest includes auto-apply stats — **blocked on Phase 0**

---

## Phase 3 — Premium Tier + Expansion (Days 61–90)

**Goal:** DamKoi has paying users, enforced free-tier limits, and Pickaboo auto-apply live.

> **Note:** Track G (Real Claude AI) is **deferred** until revenue generates. `services/ai.py` mock remains. Do not implement until founder decision.

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

### Track G — Real Product Lens (Claude API) — ⛔ DEFERRED

Deferred until revenue generates. `services/ai.py` stays as keyword-based mock. Do not implement.

When undeferred: replace mock with `claude-haiku-4-5-20251001`, add `ProductLens` table (TTL 7 days), add `ProductLensCard` to product page with paywall gate for full summary.

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
- [ ] Product Lens — **deferred (no AI until revenue)**
- [ ] Premium feature gating enforced: 3-alert cap for free, unlimited for premium
- [ ] SSLCommerz checkout works end-to-end; one real ৳199 production purchase confirmed
- [ ] Auto-apply working on Daraz + Pickaboo; safety guardrails in place
- [ ] 5,000+ extension installs; 15,000 web MAU
- [ ] 8,000 active alerts
- [ ] Load tests pass on both endpoints (p95 targets met)
- [ ] Verdict accuracy ≥ 95% on per-platform 50-SKU manual sample

---

## Open Technical Gaps — Updated 2026-05-07

| # | Gap | Status |
|---|---|---|
| 1 | `cluster_ungrouped_products` calling successfully | ⚠️ Function confirmed in code; **production DB count still unverified** |
| 2 | Bengali translations populated | ✅ Confirmed — 100+ strings in bn.json |
| 3 | `Product.last_backfilled_at` column in DB | ✅ Migration `d5e6f7a8b9c0` created and deployed 2026-05-07 |
| 4 | Web pages connected to real API | ✅ Confirmed — all routes have real API calls |
| 5 | CORS for `damkoi.xynly.com` | ✅ Confirmed — backend config includes production origins / Vercel env controls deployed origins |
| 6 | `users.is_premium` + `users.premium_expires_at` columns | ✅ Migration `e6f7a8b9c0d1` created and deployed 2026-05-07 |
| 7 | `backend/app/models/subscription.py` | ❌ Missing — Phase 3 only, deferred |
| 8 | Extension popup Daraz-only detection | ✅ Fixed 2026-05-07 — all 6 platforms now detected |

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
| Vercel (web + FastAPI serverless) | Free → Pro $20/mo | $0 | $20 |
| Supabase Postgres + Auth | Free | $0 | $25 (Pro at 50K MAU / DB growth) |
| Redis / Upstash (optional cache) | Free → paid | $0 | $10 |
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
| Vercel serverless limits block long scrapes/jobs | High | High | Keep request-time API lightweight; run non-browser jobs via Vercel Cron and move browser scrapers to a dedicated Playwright-capable worker when needed |

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
