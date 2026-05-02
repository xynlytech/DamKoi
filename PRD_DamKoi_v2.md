# Product Requirements Document
## DamKoi — BuyHatke for Bangladesh

**Version:** 3.0 (Multi-Platform Repositioning)
**Date:** May 2026
**Status:** Active — extension live on Daraz; multi-platform expansion in progress
**Web:** [damkoi.xynly.com](https://damkoi.xynly.com)
**API:** [api.damkoi.com](https://api.damkoi.com)
**Author:** Md. Jubair Hasan

---

## What's Live Today

> A snapshot of the product as it ships on the day this PRD was written. Read this before assuming anything is unbuilt.

- **Daraz scraper** with Playwright stealth, UA rotation, and `__NEXT_DATA__` extraction
- **Wayback Machine backfill** that recovers months of historical Daraz prices from archive.org snapshots
- **Sitemap harvester** crawling Daraz URLs from Archive.org CDX
- **Verdict engine** with five labels (FAKE_DISCOUNT / BEST_PRICE / GOOD_DEAL / FAIR_PRICE / INSUFFICIENT_DATA) and a 1–10 deal score
- **Coupon engine** surfacing platform-wide and product-specific codes, refreshed every two hours
- **Chrome extension** (Manifest V3) with inline widget, sidebar, and popup
- **Email price-drop alerts** via Resend (free tier = 3 active alerts)
- **Anonymous tracking** via `anon_id` (no login required for first alert)
- **Supabase auth** for sign-in once a user exceeds the free tier
- **Ops bots:** Sentry for errors, Telegram for scraper health and curated deals
- **Web app** scaffolded at `damkoi.xynly.com` with routes for product, compare, dashboard, deals, alerts, and install

This PRD describes the next 90 days of expansion, not a bootstrap.

---

## Table of Contents

1. [Vision & Positioning](#1-vision--positioning)
2. [The Problem](#2-the-problem)
3. [Target Users](#3-target-users)
4. [Competitive Landscape](#4-competitive-landscape)
5. [Strategic Positioning & Moat Preview](#5-strategic-positioning--moat-preview)
6. [Product Surface](#6-product-surface)
7. [Feature Spec — Core (Price History, Verdict, Alerts)](#7-feature-spec--core)
8. [Feature Spec — Coupons & Auto-Apply](#8-feature-spec--coupons--auto-apply)
9. [Feature Spec — Alternatives & Cross-Platform Compare](#9-feature-spec--alternatives--cross-platform-compare)
10. [Feature Spec — Web Dashboard at damkoi.xynly.com](#10-feature-spec--web-dashboard)
11. [Feature Spec — AI Layer (Phase 2/3)](#11-feature-spec--ai-layer)
12. [Supported Platforms & Roadmap](#12-supported-platforms--roadmap)
13. [System Architecture](#13-system-architecture)
14. [Data Model](#14-data-model)
15. [Scraper Strategy](#15-scraper-strategy)
16. [Matching Engine (V1 → V3)](#16-matching-engine-v1--v3)
17. [API Design](#17-api-design)
18. [Chrome Extension Design](#18-chrome-extension-design)
19. [Web Dashboard Design](#19-web-dashboard-design)
20. [UX Flow & Aha Moments](#20-ux-flow--aha-moments)
21. [Success Metrics](#21-success-metrics)
22. [Go-To-Market Strategy](#22-go-to-market-strategy)
23. [Monetization](#23-monetization)
24. [90-Day Roadmap](#24-90-day-roadmap)
25. [Risks & Mitigations](#25-risks--mitigations)
26. [Strategic Moat](#26-strategic-moat)
27. [Open Questions](#27-open-questions)

---

## 1. Vision & Positioning

### Vision

DamKoi is **BuyHatke for Bangladesh** — the shopping intelligence layer that makes price history, fake-discount detection, alerts, and coupon discovery work across every major BD e-commerce platform, in the user's browser and on the web.

BuyHatke proved this category in India: 800,000+ active extension users, 30+ million products tracked across 300+ websites, 100+ supported retailers, ad-funded with brand deals rather than affiliate-dependent. Bangladeshi shoppers have the same pathology — fake discounts, scattered marketplaces, no price memory — and zero equivalent tooling. DamKoi is that tooling.

### One-Line Pitch

> *"DamKoi is Bangladesh's shopping intelligence layer — price history, fake-discount detection, alerts, and coupons across every major BD store, in your browser and on the web."*

### Core Insight

> **Trust is broken in Bangladeshi e-commerce.**

Sellers inflate base prices before sale events (Eid, 11.11, 12.12, Pahela Baishakh) and slap "40% OFF" badges on prices that are the same as or higher than normal. Shoppers know this is happening — but until DamKoi, they had no tool to prove it, no memory of yesterday's price, and no signal across platforms.

DamKoi fixes trust. Every feature must serve this mission.

### Two Surfaces, Equal Weight

DamKoi ships on two surfaces from day one (mobile is Phase 3):

1. **Chrome extension** — injects a price-history widget and deal verdict on supported BD product pages
2. **damkoi.xynly.com** — paste any BD product URL, search, browse the deals feed, manage alerts, compare across platforms

The extension lives where shopping happens. The web is the canonical reference. They share the same backend, the same verdicts, the same alerts.

---

## 2. The Problem

### Fake Discounts Are Endemic

During Eid sales, 11.11, 12.12, and Pahela Baishakh, sellers routinely inflate the "original price" the week before the sale and then display a 40–60% discount badge on prices that are the same as or higher than the pre-sale price. Daraz, Pickaboo, Othoba — same playbook. Shoppers have no historical data to verify whether the displayed price is genuinely lower than usual.

### BD E-commerce Is Scattered

A Bangladeshi shopper looking for a phone might check Daraz, Pickaboo, Othoba, and Cartup. A book buyer checks Rokomari, Boi Bichitra, and Daraz. A grocery buyer checks Chaldal, Othoba, and GhorerBazar. A beauty buyer checks Shajgoj and Daraz Mall. Food orders run through Foodpanda and Pathao Food. There is no unified price view. Every comparison is a tab juggle.

### No Price Memory Anywhere

A shopper who wants to wait for a phone to hit ৳38,000 has to manually check every day. There is no automated way to be notified of a price drop on any Bangladeshi platform. Daraz's "Save for later" is not a price tracker.

### Coupon Chaos

bKash, Nagad, and Rocket cashback codes — plus platform-issued promo codes — are scattered across Facebook deal groups, Telegram channels, and seller posts. Half are expired. Half don't apply. There is no Honey-equivalent for BD checkouts.

### No Bengali-Native Tooling

CamelCamelCamel and Keepa work on Amazon. BuyHatke works on Indian sites. PriceSpy works in Europe. None of them index Daraz, Pickaboo, Rokomari, Chaldal, or any other BD platform. None of them speak Bengali. Bangladesh is invisible to global price-tracking infrastructure.

### Market Validation Signal

Search "Daraz price history Bangladesh," "Daraz fake discount," or "Pickaboo cheaper than Daraz" on Facebook → thousands of posts, complaints, comparison threads, and screenshot demands. The demand is proven. The tool just didn't exist until DamKoi.

---

## 3. Target Users

### Primary Segment

**Profile:** Suspicious shoppers aged 18–35 in Dhaka, Chattogram, Sylhet — students and young professionals who already distrust platform sale badges.

**Specific communities:**
- University students — BUET, DU, NSU, BRAC University, IUT, CUET
- Early-career professionals (first or second job, salary ৳25K–80K/month)
- Tech-aware deal hunters active in Facebook deal groups and Telegram channels

**Behavioral traits:**
- Heavy multi-platform shoppers — Daraz daily, Chaldal weekly for groceries, Rokomari for books, Pickaboo for electronics
- Screenshot prices and compare manually across browser tabs
- Highly price-sensitive; will wait days or weeks for a real deal
- Trust peer recommendations and Telegram channel curators over platform advertising
- Share screenshots of "fake sale" finds in WhatsApp groups for social proof
- Mix of Bengali and English UI preference (English-leaning for tech, Bengali for everyday goods)

**Why they will use DamKoi:**
They already suspect fake discounts. DamKoi gives them proof — with one verdict, one number, one cross-platform comparison. It turns suspicion into a decision they can defend in a group chat.

> *We are building for the suspicious shopper, not the first-time online shopper.*

### Persona Snapshots

| Persona | Frequency | Platform mix | Lang | Hero feature |
|---|---|---|---|---|
| Tech-savvy Dhaka student | Daily browse, weekly buy | Daraz + Pickaboo + Rokomari | EN | Cross-platform compare |
| Family-buying young professional | 2–3x/month | Daraz + Chaldal + Othoba | BN/EN mix | Verdict + alerts |
| Telegram deal hunter | Daily | All platforms | EN | Deals feed + Wayback |
| Campus reseller | Weekly bulk | Daraz + Chaldal | BN | Premium history + CSV |
| Beauty buyer | Monthly | Shajgoj + Daraz Mall | BN | Price history |

### Secondary Segments

- **Deal community moderators** running 50K–500K-member Facebook deal groups — they will amplify DamKoi if it gives them a credible sourcing tool
- **Expat Bangladeshis** sending gifts home — need to know what's a fair price they'll be charged
- **Small e-commerce sellers and resellers** monitoring competitor pricing on Daraz/Chaldal (B2B, Phase 4)

---

## 4. Competitive Landscape

### BuyHatke India — the Model We Adapt

| BuyHatke Feature | What It Does | DamKoi BD Status |
|---|---|---|
| Browser extension on 100+ retailers | Inline price history graph + deal verdict | **Live** (Daraz); **Building** (Cartup, Rokomari, Pickaboo, Chaldal) |
| Web platform (compare.buyhatke.com) | URL paste + search + dashboard | **Building** (`damkoi.xynly.com` partially scaffolded) |
| Mobile apps (iOS + Android) | Full feature parity | **Phase 3** |
| 3-month price history graph | Line chart with peaks/drops/optimal-buy windows | **Live** (Daraz, with Wayback backfill) |
| Price-drop alerts (multi-channel) | Email, push, browser notifications | **Live** (email); **Building** (push, Telegram) |
| Deal Score / fake-discount verdict | AI-assisted "is this a real deal" badge | **Live** (1–10 score, 5 verdict labels) |
| Auto coupon application at checkout | DOM-injects best code on cart page | **Building** (Daraz days 31–60, then Pickaboo/Foodpanda) |
| Lookalike product discovery | Visual similarity → cheaper alternatives | **Phase 3** |
| Product Lens (AI review summary) | Aggregates reviews/specs across retailers | **Phase 2** |
| Spend Lens (expense aggregation) | Cross-platform spending dashboard | **Phase 3** |
| Multi-language UI | 25 languages incl. Hindi, Bengali | **Phase 2** (Bengali UI) |
| Brand-ad-funded model | Display ads + Goodies platform | **Phase 2** (ads-first, see §23) |

This table is the spec for parity. We are not cloning — we are localizing.

### BD Direct Competitors

**Zero direct competitors.** No Bangladeshi product offers price history, fake-discount detection, or cross-platform comparison.

**Adjacent / partial overlap:**
- PriyoShop deal aggregators (curated deals, no history, no verdicts)
- Telegram channels (manual curation, no API, no alerts, no per-user tracking)
- Facebook deal groups (community-driven, no data layer)

### Orthogonal Proof Points

- **CamelCamelCamel** (US, Amazon-only) — proves the Amazon price-history category for over a decade
- **Keepa** (US/EU, Amazon) — premium tier with API; proves users will pay for depth
- **PriceSpy** (EU, multi-platform) — proves the cross-platform model in a regulated market
- **Honey** (global, coupons) — proves auto-apply at checkout retains users (acquired by PayPal for $4B)
- **BuyHatke** (India, multi-platform + AI) — the closest analog and our north star

### BD-Specific Advantages We Have

- **bKash/Nagad/Rocket awareness** — payment-method coupons unique to BD
- **Bengali language** — the only multi-platform price tool with planned native BN UI
- **Wayback backfill on Daraz** — months of price history on day one (no global tool has this for BD)
- **Sale-event tagging** — Eid / Pahela Baishakh / 11.11 / 12.12 / Boi Mela explicitly modeled
- **Local payments** — display savings in BDT, not USD-converted

---

## 5. Strategic Positioning & Moat Preview

### What DamKoi Is

A **multi-surface decision engine** for Bangladeshi shopping. Three jobs to be done:

| Feature | Job for the user |
|---|---|
| Price History | Show me what the real price has been |
| Fake Discount Detector | Tell me if this current "sale" is real |
| Cross-Platform Compare | Show me if this is cheaper somewhere else |
| Price Alerts | Tell me when to buy |
| Auto-Apply Coupons | Save me money at checkout without me searching |

### What DamKoi Is Not

- Not a price-comparison-only site (those are passive — DamKoi is active)
- Not a Daraz clone or a marketplace
- Not a cashback app (cashback markets are well-served by bKash/Nagad already)
- Not a coupon-only tool (coupons are one feature, not the product)

### Positioning Statement

For Bangladeshi online shoppers tired of being misled by fake discounts and tired of opening five tabs to compare prices, **DamKoi is the shopping intelligence layer that shows real price history, flags inflated discounts, compares across BD platforms, and applies coupons at checkout** — unlike manual screenshotting or trusting platform sale badges.

### Moat Preview (full treatment in §26)

1. **Wayback backfill** — months of Daraz price history at zero scraping cost. No competitor can replicate this cheaply.
2. **Multi-platform first-mover in BD** — by Day 90, five platforms shipped with per-platform adapters; no one else has even one.
3. **Trust** — accurate verdicts compounding into a brand. Trust is scarce in BD e-commerce; trust is worth more than features.
4. **Bengali-native AI** — sentence embeddings trained on BD product titles for cross-platform matching (V3, §16).

---

## 6. Product Surface

### The Three Surfaces

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Chrome Extension    │  │  damkoi.xynly.com   │  │  Mobile (Phase 3)   │
│ (live on Daraz,     │  │  (web — Next.js,    │  │  iOS + Android      │
│  expanding to 4     │  │   partially live)   │  │                     │
│  more platforms)    │  │                     │  │                     │
└──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘
           │                        │                        │
           └────────────────────────┼────────────────────────┘
                                    │
                ┌───────────────────▼───────────────────┐
                │     FastAPI on Render                  │
                │     (api.damkoi.com)                   │
                └────────────────────────────────────────┘
```

### Surface × Feature Matrix

| Feature | Extension | Web | Mobile |
|---|---|---|---|
| Verdict on product page | **Live** | **Building** | Phase 3 |
| Price history chart | **Live** | **Building** | Phase 3 |
| Set price alert | **Live** | **Building** | Phase 3 |
| Manage alerts | — | **Building** | Phase 3 |
| Cross-platform compare | **Building** | **Building** | Phase 3 |
| Coupons (display) | **Live** | **Building** | Phase 3 |
| Coupons (auto-apply) | **Building** (days 31–60) | n/a | n/a |
| Deals feed | — | **Building** | Phase 3 |
| URL paste / search | **Live** (popup) | **Building** | Phase 3 |
| Bengali UI | Phase 2 | Phase 2 | Phase 3 |

### Why Two Surfaces from Day One

The extension lives **inside the shopping moment** — the user never has to remember to switch tabs. But the web is **the canonical reference** — it's where users come back when they want to compare, browse the deals feed, or check on alerts they set last week. The two surfaces share the same backend, the same verdicts, the same alerts. A user who tracks a product in the extension sees it in their web dashboard. A user who pastes a URL on the web can install the extension to get inline verdicts on their next Daraz visit.

This is a meaningful change from earlier framing that deferred web to Phase 2. **damkoi.xynly.com is co-equal with the extension, shipping in the first 30 days.**

---

## 7. Feature Spec — Core

### 7.1 Price History Graph — **Live**

**Description:** For any tracked BD product, display a time-series line chart of price over time, annotated with key events.

**User story:** *As a shopper looking at a Daraz product, I want to see how the price has changed over the past 90 days so I can tell whether today's "sale" price is genuinely low.*

**Functional requirements:**
- Display price history from first scrape date (or earliest Wayback snapshot, see §15.2) up to present
- Time range toggles: 7 days / 30 days / 90 days / All time
- Annotate: all-time low, all-time high, current price, sale-event windows (Eid, 11.11, etc.)
- Show stock availability (in stock / out of stock) on the same chart
- Graceful degraded state: if fewer than 7 days of data, show available data with a "tracking since [date]" label and an INSUFFICIENT_DATA verdict

**Display values (always visible):**
```
📉 Lowest Ever:   ৳12,500   (Jan 15, 2026)
📊 30-Day Avg:    ৳14,800
💰 Current:       ৳16,200
📈 Highest Ever:  ৳17,500   (Mar 02, 2026)
```

**Backend:** Served by `GET /products/{id}/price-history?days=90` (`backend/app/routers/products.py`).

---

### 7.2 Fake Discount Detector — **Live**

**Description:** The flagship feature. A single verdict — displayed prominently — telling the user whether the current discount is real or inflated.

**User story:** *As a shopper who sees "40% OFF" on a Daraz listing, I want to know immediately whether this discount is real or whether the seller just inflated the original price.*

**Detection Logic (V1 — Rule-Based, live in `backend/app/services/verdict.py`):**

```python
def get_verdict(current_price, prices_last_30_days, all_prices_ever):
    if len(prices_last_30_days) < 5:
        return "INSUFFICIENT_DATA"

    avg_30d = mean(prices_last_30_days)
    all_time_low = min(all_prices_ever)
    discount_from_avg = (avg_30d - current_price) / avg_30d

    if current_price > avg_30d * 1.05:
        return "FAKE_DISCOUNT"        # higher than normal
    elif current_price <= all_time_low * 1.02:
        return "BEST_PRICE"           # at or near all-time low
    elif discount_from_avg >= 0.10:
        return "GOOD_DEAL"            # genuinely 10%+ below average
    elif discount_from_avg >= 0.00:
        return "FAIR_PRICE"           # at or near normal price
    else:
        return "FAKE_DISCOUNT"        # elevated vs. average
```

**Verdict Labels and UI:**

```
❌  FAKE DISCOUNT
    Price is ৳1,400 ABOVE the 30-day average.
    This is NOT a good time to buy.

✅  BEST PRICE — ALL-TIME LOW
    This is the lowest price we've ever tracked!
    All-time low: ৳12,500.

🔥  GOOD DEAL
    Price is 15% below the 30-day average.
    One of the better prices we've seen.

🟡  FAIR PRICE
    Price is normal. No special deal right now.

⏳  TRACKING — NOT ENOUGH DATA YET
    We've only tracked this product 3 time(s).
    We need at least 5 price points over 14 days.
```

**Deal Score (1–10):**

| Score | Meaning |
|---|---|
| 9–10 | At or near all-time low |
| 7–8 | Genuinely below average |
| 5–6 | Normal / fair price |
| 3–4 | Slightly elevated |
| 1–2 | Clearly inflated / fake |

**Confidence:** every verdict carries a confidence float (0.0–1.0) based on data density. Verdicts below 0.3 confidence display the INSUFFICIENT_DATA label regardless of math.

---

### 7.3 Price Drop Alerts — **Live (email); Building (push, Telegram)**

**Description:** Users set a target price; DamKoi notifies them when the product reaches it.

**User story:** *As a shopper who wants a specific phone but thinks ৳42,999 is too high, I want to be notified when the price drops to ৳38,000, so I can buy at the right moment without checking daily.*

**Functional requirements:**
- Set target price via extension popup, web dashboard, or product page
- **No login required for first alert** — stored against `anon_id` (browser fingerprint + localStorage)
- Login (Supabase) required for second alert onwards (growth lever)
- Notification channels: **Email (live, via Resend); Push via PWA + Telegram (Phase 2); WhatsApp (Phase 3, pending WABA)**
- Alert triggers: price drops below target; product hits all-time low; restocked after being out of stock
- Rate limit: one notification per product per 24 hours (no spam)
- Alert pause / reactivate from dashboard
- **Free tier: 3 active alerts; Premium: unlimited**

**Backend:** `POST /alerts`, `GET /alerts`, `PUT /alerts/{id}`, `DELETE /alerts/{id}` (`backend/app/routers/alerts.py`). Background task `check_all_alerts` runs every 15 minutes.

---

## 8. Feature Spec — Coupons & Auto-Apply

### 8.1 Coupon Discovery — **Live**

**Description:** Surface platform-wide and product-specific promo codes alongside the product verdict.

**Live today (`backend/app/services/coupons.py`):**
- Platform-wide codes (e.g., DARAZ-EID2026)
- Product-specific codes (auto-attached to a product)
- Expiry tracking (`expires_at`)
- Discount type: percentage or flat
- Minimum spend threshold
- Refresh every 2 hours

**UI on product page:**
```
🎟  Available Coupons (3)
    DARAZ-EID2026   — 10% off, min ৳5,000      [Copy]  expires 2026-05-12
    BKASH-CASHBACK  — ৳200 cashback             [Copy]  expires 2026-05-31
    CITY-BANK-CC    — 5% off with City Bank CC  [Copy]  expires 2026-06-15
```

### 8.2 Auto-Apply at Checkout — **Building (Days 31–60 on Daraz, Days 61–90 on Pickaboo + Foodpanda)**

**Description:** When a user reaches a checkout page on a supported BD platform, DamKoi detects the cart, fetches the best applicable code, injects it into the promo-code field, and shows the savings.

**UX flow:**
```
1. User on Daraz cart page
2. Extension detects cart page (DOM signature + URL pattern)
3. Calls /coupons/{platform}?cart_total={total}
4. Receives ranked list of valid codes
5. Tries the top code automatically; on failure, tries next
6. On success, shows toast: "✓ Saved ৳450 with DARAZ-EID2026"
7. User confirms checkout
```

**BD-specific:** bKash / Nagad / Rocket cashback codes are detected by payment-method context (when the user selects a wallet, surface wallet-specific codes).

**BuyHatke parallel:** Equivalent to BuyHatke's auto-apply on Myntra, Ajio, Walmart, Target, eBay. Same UX pattern, BD platforms.

**Constraints honesty:** Not every BD checkout permits programmatic code injection (some require server-side validation that breaks on rapid retries). For platforms where injection isn't safe, we surface the best code and a one-click copy button instead — no silent failure.

**Legal posture:** Auto-apply only fires after explicit user opt-in during onboarding. We never auto-checkout. We never store payment data. ToS posture per platform is a tracked open question (see §27).

---

## 9. Feature Spec — Alternatives & Cross-Platform Compare

### 9.1 Same-Platform Alternatives — **Live**

**Description:** When a product is flagged as fake-discount or fairly priced, surface 3 cheaper alternatives from the same category on the same platform.

**V1 logic (live in `backend/app/services/alternatives.py`):**
```python
def find_alternatives(product):
    candidates = products_in_same_category(product.category)
    candidates = filter(lambda p: p.current_price < product.current_price * 0.90, candidates)
    candidates = filter(lambda p: p.deal_score >= 6, candidates)
    return sorted(candidates, key=lambda p: p.deal_score, reverse=True)[:3]
```

**UI:** "Better alternatives found 👇" card below the verdict, showing 3 products with deal score, price, image.

### 9.2 Cross-Platform Compare — **Building (depends on §16 V2 matching engine)**

**Description:** When the same product (or a confident match) exists on multiple BD platforms, show the side-by-side price comparison.

**User story:** *As a shopper looking at a Samsung A55 on Daraz, I want to see whether the same phone is cheaper on Pickaboo or Cartup right now.*

**UX:**
```
🔄 Same product on other BD platforms:
    Pickaboo:  ৳39,900   (✓ ৳3,099 cheaper) →
    Cartup:    ৳41,500   (৳1,499 cheaper)   →
    Othoba:    ৳42,800   (close to Daraz)   →
```

**Confidence rule (preserved from v2):** Never show a cross-platform suggestion below 82% match confidence. False positives destroy trust faster than a missed match.

**Backend:** New endpoint `GET /compare/{product_id}` that returns matched products across platforms with prices, verdicts, and deep links.

---

## 10. Feature Spec — Web Dashboard

### Routes at damkoi.xynly.com

| Route | Purpose | Status |
|---|---|---|
| `/` | Hero (paste URL + search) + featured deals carousel + "How DamKoi works" | **Building** |
| `/product/[id]` | Full chart, verdict, alternatives, cross-platform compare, coupons | **Building** |
| `/compare/[id]` | Side-by-side price grid across BD platforms for a matched product | **Building** |
| `/dashboard` | User's tracked products + alerts management | **Building** |
| `/deals` | Filterable feed: by platform, category, deal_score | **Building** |
| `/alerts` | Alert CRUD (target price, channel, pause/resume) | **Building** |
| `/install` | Extension install funnel + browser detection | **Building** |
| `/privacy` | Privacy policy (live in repo, content placeholder) | **Building** |

The `web/src/app/` folder has all routes scaffolded as of writing. Build status reflects real Next.js page work, not greenfield.

### SEO Play

Every `/product/[id]` page is server-rendered and indexable. Long-tail target queries: "Samsung A55 price history Bangladesh," "iPhone 15 Daraz vs Pickaboo," "Best price Chaldal rice 5kg." Programmatic SEO across the top 1,000 products generates a moat that compounds over months.

### Bengali UI

Phase 2 deliverable. Every string lives in a translation table; toggle in header. Initial translation in-house, community-corrected via a "report bad translation" link.

---

## 11. Feature Spec — AI Layer (Phase 2/3)

> Phase 2/3 — not in current scope. Documented here so the architecture stays coherent.

### 11.1 Product Lens Equivalent — **Phase 2**

AI-summarized review/spec/value analysis across platforms. For a phone tracked on Daraz, Pickaboo, and Cartup, summarize the consensus view of reviews and surface the spec sheet from the most authoritative source. Bengali review summarization is the BD-specific differentiator BuyHatke can't easily replicate.

**Infra:** LLM provider (Anthropic Claude, given existing relationship). Cached per-product summary refreshed weekly.

### 11.2 Spend Lens Equivalent — **Phase 3**

Aggregated spending dashboard for logged-in users. With user opt-in, parse order confirmation emails forwarded to a DamKoi address; produce monthly spend rollups by category and platform.

**Infra:** Forwarded-email parsing pipeline; user opt-in only.

### 11.3 Visual Lookalike Search — **Phase 3**

Paste a product image, find cheaper visual matches across BD platforms. Hardest of the three to ship.

**Infra:** Vision embedding model (CLIP or equivalent). Vector DB for image search.

### 11.4 Bengali-Native Embedding for Matching — **Phase 2 / V3 of §16**

`paraphrase-multilingual-MiniLM-L12-v2` fine-tuned on BD product titles. Resolves BN ↔ EN matching: `স্যামসাং গ্যালাক্সি A55` ↔ `Samsung Galaxy A55 5G`.

---

## 12. Supported Platforms & Roadmap

| Month | Platform | Vertical | Scraper Difficulty | Wayback Coverage | Status | Why Prioritized |
|---|---|---|---|---|---|---|
| Now | **Daraz** | General marketplace | High (Akamai) | Strong | **Live** | Dominant BD marketplace; existing build |
| Days 1–30 | **Cartup** | Electronics + general | Medium | Moderate | **Building** | #2 marketplace with growing share |
| Days 1–30 | **Rokomari** | Books + media | Low (server-rendered) | Moderate | **Building** | Vertical lock; high-loyalty user base |
| Days 1–30 | **Pickaboo** | Electronics | Medium | Moderate | **Building** | Strongest competitor to Daraz on phones |
| Days 31–60 | **Chaldal** | Grocery | Medium (internal API) | Low | **Building** | Daily-frequency vertical; high retention |
| Days 61–90 | **Othoba** | General | Medium | Low | **Building** | Fifth platform = BuyHatke-style breadth claim |
| Months 4–6 | Bagdoom | Coupons + general | Medium | Low | Phase 2 | Coupon-aggregator overlap |
| Months 4–6 | Shajgoj | Beauty | Low (WooCommerce) | Low | Phase 2 | Vertical for female-skewing audience |
| Months 4–6 | Ajkerdeal | General | Medium | Low | Phase 2 | Long-tail SKUs |
| Phase 3 | Foodpanda | Food delivery | High | Low | Phase 3 | Daily-use; needs auto-apply for value |
| Phase 3 | Pathao Food | Food delivery | High | Low | Phase 3 | Same as Foodpanda |
| Phase 3 | Bikroy | Used goods | High (variable pricing) | Low | Phase 3 | Hardest to define "price history" |

**Platform priority criteria:**
1. Traffic size (users + buying frequency)
2. Scraper difficulty (lower = faster ship)
3. Vertical gap (does adding this platform unlock a new shopper persona?)
4. Wayback coverage (lower means more cold-start time before verdicts work)

**Per-platform adapter contract:** Each new platform = one file in `backend/app/scraper/` exposing `fetch(url) → ProductData`. The adapter is the only platform-specific code; the rest of the pipeline (verdicts, alerts, alternatives) is platform-agnostic.

---

## 13. System Architecture

### Today's Stack (as deployed)

```
┌─────────────────────────────────────────────────────────────┐
│                 USER INTERFACES                              │
│   Chrome Extension  │  Next.js Web   │  Mobile (Phase 3)    │
│   (MV3, live)       │  (damkoi.xynly │                      │
│                     │   .com)        │                      │
└──────────┬──────────────────┬──────────────┬────────────────┘
           │                  │              │
           └──────────────────┼──────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│         FastAPI on Render — api.damkoi.com                    │
│   SlowAPI rate limiting · Sentry · CORS · Supabase JWT auth   │
└──────┬─────────────────────┬────────────────┬─────────────────┘
       │                     │                │
┌──────▼──────┐   ┌──────────▼──────┐  ┌─────▼──────────┐
│ Products &  │   │  Alerts Service │  │  Auth (Supabase)│
│ Verdicts    │   │  (APScheduler)  │  │                │
└──────┬──────┘   └──────────┬──────┘  └────────────────┘
       │                     │
┌──────▼─────────────────────▼─────────────────────────────────┐
│                    DATA LAYER                                 │
│   PostgreSQL (Render)   ·   Redis (cache, optional)           │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│              SCRAPER PLANE (per-platform adapters)            │
│   daraz_scraper.py (live) · cartup, rokomari, pickaboo,       │
│   chaldal (building) · sitemap_harvester · wayback backfill   │
└───────────────────────────────────────────────────────────────┘
       │                                          │
┌──────▼──────┐                            ┌──────▼──────┐
│  Resend     │                            │  Telegram   │
│  (alerts +  │                            │  (ops bot + │
│   emails)   │                            │  deals chan)│
└─────────────┘                            └─────────────┘
```

### Decisions and Rationale

| Decision | Choice | Why this, why not the alternative |
|---|---|---|
| Hosting | **Render** | Docker-native, $7–25/mo, fast deploy. Not Railway (less reliable free tier), not AWS (overkill for current scale). |
| Backend | **FastAPI (Python)** | Same language as scraper; async-native; fast. Not Node (scraper Python ecosystem stronger). |
| Scraper | **Playwright + stealth plugin** | Daraz is a JS-heavy SPA behind Akamai; Scrapy alone can't render. Stealth defeats most bot fingerprints. |
| **Backfill** | **Wayback Machine + Archive.org CDX** | Months of historical prices at zero cost. This is a moat — see §15.2 and §26. |
| DB | **PostgreSQL** | Time-series price data + relational users/alerts. Not InfluxDB (extra ops surface). |
| Cache | **Redis (optional, graceful fallback)** | Sub-10ms reads; also queue. App degrades if Redis missing rather than failing. |
| Auth | **Supabase** | Free 50K MAU; managed; fast integration. Not roll-our-own (security cost too high). |
| Email | **Resend** | Free 100/day; better DX than SendGrid; reliable transactional. |
| Errors | **Sentry** | Free 5K events/mo. Worth it for scraper diagnostic data. |
| Ops | **Telegram bot** | Already where founders + community live. Pages on scraper failures + posts curated deals. |
| Web | **Next.js on Vercel/Render** | SSR for SEO on `/product/[id]` pages (programmatic SEO is part of the moat). |
| Scheduler | **APScheduler in-process** | Simpler than Celery + Redis broker for current scale. Migrate to Celery if scraper count > 50/min. |

### Multi-Platform Scraper Plane

Per-platform adapters all drop into the same `PriceSnapshot` table with `platform` + `external_id`. The verdict engine, alert engine, and alternatives engine are all platform-agnostic. Adding a new platform is one new file in `backend/app/scraper/` plus one row in the platform registry.

---

## 14. Data Model

### As-Deployed Schema (7 Alembic-Migrated Tables)

```sql
-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform        VARCHAR(50) NOT NULL DEFAULT 'daraz',   -- multi-platform-ready since v1
    external_id     VARCHAR(255) NOT NULL,
    url             TEXT NOT NULL,
    title           TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    category        VARCHAR(255),
    brand           VARCHAR(255),
    model_number    VARCHAR(255),
    image_url       TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    first_seen_at   TIMESTAMPTZ DEFAULT NOW(),
    last_scraped_at TIMESTAMPTZ,
    UNIQUE (platform, external_id)
);

-- ============================================================
-- PRICE SNAPSHOTS (append-only, never update)
-- ============================================================
CREATE TABLE price_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    product_id      UUID REFERENCES products(id),
    price           INTEGER NOT NULL,           -- in BDT paisa
    original_price  INTEGER,                    -- crossed-out price
    discount_pct    SMALLINT,                   -- as shown by platform
    in_stock        BOOLEAN DEFAULT TRUE,
    scraped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source          VARCHAR(50) DEFAULT 'live'  -- 'live' | 'wayback'
);
CREATE INDEX idx_price_history ON price_snapshots (product_id, scraped_at DESC);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20),
    anon_id         VARCHAR(255) UNIQUE,        -- pre-login tracking
    auth_provider   VARCHAR(50),                -- 'supabase' | 'email' | 'shadow'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRACKED PRODUCTS (user wishlist)
-- ============================================================
CREATE TABLE tracked_products (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    anon_id         VARCHAR(255),               -- pre-login
    product_id      UUID REFERENCES products(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (product_id, COALESCE(user_id::text, anon_id))
);

-- ============================================================
-- PRICE ALERTS
-- ============================================================
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    product_id      UUID REFERENCES products(id),
    target_price    INTEGER NOT NULL,           -- paisa
    notify_via      VARCHAR(50)[] DEFAULT '{email}',
    is_active       BOOLEAN DEFAULT TRUE,
    last_triggered  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALERT EVENTS (notification log, audit trail)
-- ============================================================
CREATE TABLE alert_events (
    id              BIGSERIAL PRIMARY KEY,
    alert_id        UUID REFERENCES alerts(id),
    price_at_trigger INTEGER NOT NULL,
    channel         VARCHAR(50),
    sent_at         TIMESTAMPTZ DEFAULT NOW(),
    success         BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- COUPONS (platform-wide + product-specific)
-- ============================================================
CREATE TABLE coupons (
    id              BIGSERIAL PRIMARY KEY,
    product_id      UUID REFERENCES products(id),  -- nullable = platform-wide
    platform        VARCHAR(50) NOT NULL,
    code            VARCHAR(255) NOT NULL,
    discount_pct    SMALLINT,                       -- nullable
    discount_flat   INTEGER,                        -- paisa, nullable
    min_spend       INTEGER,                        -- paisa, nullable
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_coupons_active ON coupons (product_id, is_active);
CREATE INDEX idx_coupons_code ON coupons (code);
```

### ER Sketch

```
users ──┬─ tracked_products ─── products ───┬── price_snapshots
        │                                   ├── coupons
        └─ alerts ───────────────────────── │
            │                               │
            └─ alert_events
```

### Conventions

- **All prices in paisa** (1 BDT = 100 paisa). Avoids floating-point bugs. Display layer divides by 100.
- **`platform` column is multi-platform-ready since v1.** Adding Cartup or Rokomari does not require a schema migration.
- **Append-only price history.** Never update a snapshot — only insert new ones. Source tagged (`live` / `wayback`) for diagnostic clarity.

---

## 15. Scraper Strategy

### 15.1 Daraz Scraper — **Live**

**Stack:** Playwright + `playwright-stealth` (Python) + UA rotation pool of 20 real browser strings.

**Extraction order:**
1. **Primary:** `__NEXT_DATA__` JSON blob (more reliable than DOM selectors)
2. **Fallback:** DOM selectors (`.pdp-price`, `.pdp-title`)
3. **Last resort:** raw HTML stored for 48h, parsed asynchronously in debug mode

**Anti-detection:**

| Technique | Implementation |
|---|---|
| Stealth mode | `playwright-stealth` |
| User-Agent rotation | Pool of 20 real strings |
| Request delays | Random 2–5s |
| Proxy rotation | BrightData residential (when needed) |
| Session cookies | Persisted per session |
| Crawl schedule | Off-peak (2am–6am BD time) for bulk |

### 15.2 Wayback Machine Backfill — **Live (the moat)**

> **BuyHatke does not have Wayback backfill for BD. We do.**

`backend/app/scraper/wayback.py` recovers historical Daraz prices from archive.org snapshots:

1. Query Archive.org CDX API for snapshots of a Daraz product URL
2. Collapse to one snapshot per day
3. Fetch each snapshot's raw HTML
4. Run our DOM extractor on each
5. Insert into `price_snapshots` with `source='wayback'`

The result: a product **just installed today** can have **18 months of price history** the moment we run the backfill. No competitor can replicate this cheaply — they would have to scrape from Day 1 and wait.

### 15.3 Sitemap Harvesting — **Live**

`backend/app/scraper/sitemap_harvester.py` queries Archive.org for archived Daraz `sitemap.xml` files and extracts millions of historical product URLs. We use these to:
- Seed the catalog with cold inventory
- Power "Trending" / "Recently active" feeds
- Discover SKUs sellers later removed

### 15.4 Per-Platform Adapter Contract

Every new platform (Cartup, Rokomari, Pickaboo, Chaldal) is one new file:

```python
# backend/app/scraper/<platform>_scraper.py
async def fetch(url: str) -> ScrapedProduct:
    """Returns ScrapedProduct(external_id, title, price, original_price,
       discount_pct, in_stock, category, brand, image_url) or raises ScrapeFailed."""
```

The adapter is the only platform-specific code. Verdict engine, alert engine, alternatives engine, and the entire data pipeline downstream are unchanged.

### 15.5 Scrape Scheduling (APScheduler)

```python
SCHEDULE = {
    "scrape-hot-products":      every_hour,        # >10 active alerts or >100 daily views
    "scrape-tracked-products":  every_6_hours,     # any user-tracked product
    "scrape-longtail-products": daily_at_02_00_BD, # all other tracked
    "check-price-alerts":       every_15_minutes,
    "refresh-coupons":          every_2_hours,
    "wayback-backfill":         every_6_hours,     # for newly tracked products
    "deals-feed-rebuild":       every_30_minutes,
}
```

### 15.6 Health Monitoring

- Telegram alert if any platform's scraper fails > 3 consecutive times in 1 hour
- Per-platform success rate dashboard (Sentry release health)
- Raw HTML snapshot retained 48h for debug
- Auto-retry failed scrapes after 30 minutes (max 3 retries)

**Sample Telegram alert:**
```
🚨 [Pickaboo scraper] 5/5 failures in last 30min.
   Sample URL: https://pickaboo.com/...
   Last error: TimeoutError waiting for .product-price
   Action: paused; manual review needed.
```

---

## 16. Matching Engine (V1 → V3)

Cross-platform product matching is the hardest algorithmic problem and the most defensible moat once we have ≥3 platforms live.

### V1 — Within-Platform Exact (live, MVP)

Within a platform, products have unique IDs. No matching needed: `product.external_id == scraped_external_id`.

### V2 — Fuzzy String Matching (Phase 2, when 3+ platforms live)

```python
from rapidfuzz import fuzz

def match_products(a, b) -> float:
    title_score = fuzz.token_sort_ratio(
        normalize_title(a.title), normalize_title(b.title)
    ) / 100.0
    model_bonus = 0.3 if a.model_number == b.model_number else 0.0
    return min(title_score + model_bonus, 1.0)

def normalize_title(title: str) -> str:
    title = title.lower()
    title = re.sub(r'[^\w\s]', '', title)
    title = re.sub(r'\b(free|shipping|official)\b', '', title)
    return title.strip()

MATCH_THRESHOLD = 0.82   # never show below 82% confidence
```

### V3 — Bengali-Native Embeddings (Phase 3, the AI moat)

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
# Supports Bengali natively
```

**What this unlocks:**
- `স্যামসাং গ্যালাক্সি A55` ↔ `Samsung Galaxy A55 5G`
- Abbreviations: `SM-A556E` ↔ `Samsung A55`
- Sellers who reword titles to obscure matching
- Bengali-only listings on Rokomari ↔ English listings on Daraz

### Match Quality Loops

- **Admin correction tool** — internal UI to merge / split product matches
- **User "Report wrong match" button** on every cross-platform compare card
- Reported matches feed a labeled training set for future model fine-tuning

---

## 17. API Design

### Base URL

```
https://api.damkoi.com/v1
```

### Endpoint Inventory

| Method | Path | Auth | Rate Limit | Status |
|---|---|---|---|---|
| GET | `/products/lookup?url=` | Optional (anon) | 10/min | **Live** |
| GET | `/products/{id}` | Optional | 60/min | **Live** |
| GET | `/products/{id}/price-history?days=` | Optional | 60/min | **Live** |
| GET | `/products/{id}/verdict` | Optional | 60/min | **Live** |
| GET | `/products/{id}/alternatives` | Optional | 60/min | **Live** |
| GET | `/products/search?q=&platform=` | Optional | 60/min | **Live** |
| GET | `/compare/{product_id}` | Optional | 30/min | **Building** |
| GET | `/coupons/{platform}?cart_total=` | Optional | 30/min | **Live** (Building auto-apply) |
| GET | `/deals?min_score=8&platform=&category=` | Optional | 30/min | **Live** (v2 in progress) |
| POST | `/alerts` | Required (or anon for first alert) | 10/min | **Live** |
| GET | `/alerts` | Required | 60/min | **Live** |
| PUT | `/alerts/{id}` | Required | 30/min | **Live** |
| DELETE | `/alerts/{id}` | Required | 30/min | **Live** |
| POST | `/alerts/check` | Internal (auto-apply) | n/a | **Building** |
| POST | `/track` | Optional (anon_id) | 30/min | **Live** |
| GET | `/track?anon_id=` | Optional | 60/min | **Live** |
| POST | `/auth/register` | Public | 5/min | **Live** (Supabase passthrough) |
| POST | `/auth/login` | Public | 5/min | **Live** |
| GET | `/user/dashboard` | Required | 60/min | **Live** |

### Sample Response — `/products/lookup`

```json
GET /v1/products/lookup?url=https://www.daraz.com.bd/products/...

{
  "product": {
    "id": "prod_7f3a2b",
    "title": "Samsung Galaxy A55 5G (8GB/256GB) - Awesome Iceblue",
    "platform": "daraz",
    "url": "https://www.daraz.com.bd/...",
    "image_url": "https://...",
    "category": "Smartphones",
    "current_price": 4299900,
    "original_price": 4999900,
    "platform_discount_pct": 14,
    "in_stock": true,
    "last_updated": "2026-05-01T10:30:00Z"
  },
  "verdict": {
    "label": "FAKE_DISCOUNT",
    "deal_score": 3,
    "display": "❌ FAKE DISCOUNT",
    "explanation": "Price is ৳1,800 ABOVE the 30-day average (৳41,199). This is NOT a good time to buy.",
    "current_price": 4299900,
    "avg_30d": 4119900,
    "all_time_low": 3750000,
    "all_time_low_date": "2026-01-15",
    "data_points": 142,
    "confidence": 1.0
  },
  "tracking_since": "2025-11-03T00:00:00Z",
  "wayback_recovered": 87,
  "live_scraped": 55,
  "coupons": [
    {"code": "BKASH-CASHBACK", "discount_flat": 20000, "expires_at": "2026-05-31"}
  ]
}
```

### Sample Response — `/compare/{id}`

```json
GET /v1/compare/prod_7f3a2b

{
  "anchor": {"id": "prod_7f3a2b", "platform": "daraz", "current_price": 4299900},
  "matches": [
    {
      "platform": "pickaboo",
      "product_id": "prod_98a4c",
      "match_confidence": 0.94,
      "current_price": 3990000,
      "savings": 309900,
      "verdict_label": "GOOD_DEAL",
      "url": "https://pickaboo.com/..."
    },
    {
      "platform": "cartup",
      "product_id": "prod_2e8b1",
      "match_confidence": 0.89,
      "current_price": 4150000,
      "savings": 149900,
      "verdict_label": "FAIR_PRICE",
      "url": "https://cartup.com.bd/..."
    }
  ]
}
```

### Rate Limiting (SlowAPI, live)

| Tier | Limit |
|---|---|
| Anonymous | 30 req/min/IP |
| Authenticated | 120 req/min |
| Extension (per install) | 60 req/min |
| B2B API key (Phase 4) | Custom |

---

## 18. Chrome Extension Design

### Why Extension Stays Co-Equal With Web

The extension lives **inside the user's BD shopping session.** They don't have to remember to switch tabs. The verdict appears at the moment of decision — on the page where they're about to spend money. No web dashboard can replace this proximity.

### Live Today (MV3)

Files in `extension/`:
- `manifest.json` — MV3, content scripts on Daraz, host permissions for `api.damkoi.com`
- `content.js` — detects Daraz product pages, injects inline widget + sidebar
- `popup.html` / `popup.js` — popup UI with verdict, chart, alternatives, alert setter
- `background.js` — message router, calls backend endpoints, localStorage caching
- `visualizer.js` — SVG gauges + price chart
- `inline_widget.js` — overlay widget on product pages
- `utils.js` — formatBDT, safeFetch, cache helpers
- `icons.js` — SVG icon exports

### Popup Layout (live)

```
┌─────────────────────────────────────┐
│  🛒 DamKoi                    [X]   │
├─────────────────────────────────────┤
│  Samsung Galaxy A55 5G              │
│  ─────────────────────────────────  │
│                                     │
│  ❌ FAKE DISCOUNT                   │
│  Deal Score: 3 / 10                 │
│                                     │
│  Current:        ৳42,999            │
│  30-Day Avg:     ৳41,199            │
│  Lowest Ever:    ৳37,500 (Jan 15)   │
│                                     │
│  📈 [ Price History Chart ]         │
│                                     │
│  🔄 Same on other platforms:        │
│      Pickaboo  ৳39,900  ✓ ৳3,099 ↓  │
│      Cartup    ৳41,500     ৳1,499 ↓ │
│                                     │
│  🎟  Coupons (2)        [Show all]  │
│                                     │
│  🔔 Alert me at ৳[___________]      │
│              [Set Alert]            │
└─────────────────────────────────────┘
```

### Inline Widget on Product Pages (live)

A floating chip on the product page itself, anchored top-right of the price block, shows the verdict label + deal score + "View details" → opens popup. Resolves [v2 Open Question #4](#27-open-questions): **both inline widget and popup ship**.

### Per-Platform Activation (Building)

Each new platform requires:
1. New entry in `manifest.json` `content_scripts.matches`:
   ```json
   "*://www.cartup.com.bd/products/*",
   "*://www.rokomari.com/book/*",
   "*://www.pickaboo.com/product/*",
   "*://chaldal.com/product/*"
   ```
2. New `host_permissions` entries
3. New extractor module: `extractor_<platform>.js` exposing `extract(): {productId, title, price}`
4. Content script picks the right extractor based on `window.location.hostname`

### Extension Specs

- Manifest V3 (Chrome Web Store compliant)
- Permissions: `activeTab`, `storage`, `alarms`, `clipboardWrite`
- CSP: `connect-src 'self' https://api.damkoi.com http://localhost:8000` (dev)
- Size target: < 500KB total
- Local cache: last 10 product verdicts (50ms revisit load)
- Phase 2: Firefox build (MV2 compatibility layer)

---

## 19. Web Dashboard Design

### Homepage `/`

```
┌────────────────────────────────────────────────────────────┐
│  DamKoi — Bangladesh's Shopping Intelligence Layer         │
│  ─────────────────────────────────────────────────────     │
│  [ Paste any Daraz / Pickaboo / Rokomari URL ]   [ Track ] │
│                                                            │
│  🔥 Today's Best Deals (auto-curated, deal_score >= 8)     │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │ Phone img │ │ Book img  │ │ Mixer img │ │ Phone img │   │
│  │ 9/10 ✅   │ │ 9/10 ✅   │ │ 8/10 🔥   │ │ 8/10 🔥   │   │
│  │ ৳37,500   │ │ ৳420      │ │ ৳3,200    │ │ ৳26,900   │   │
│  │ Daraz     │ │ Rokomari  │ │ Othoba    │ │ Pickaboo  │   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
│                                                            │
│  How DamKoi works · Install extension · Bengali toggle    │
└────────────────────────────────────────────────────────────┘
```

### Product Page `/product/[id]`

```
┌────────────────────────────────────────────────────────────┐
│  ← Back     Samsung Galaxy A55 5G          🔔 Set Alert     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ❌ FAKE DISCOUNT — Deal Score 3/10                        │
│  Price is ৳1,800 above the 30-day average.                │
│                                                            │
│  Current ৳42,999  ·  Avg ৳41,199  ·  Low ৳37,500 (Jan 15)  │
│                                                            │
│  📈 [ 90-day price history chart ]                         │
│       7d / 30d / 90d / All           ← Wayback recovered   │
│                                                            │
│  🔄 Compare across BD                                      │
│  ┌───────────┬──────────┬─────────────┬──────────────┐     │
│  │ Daraz     │ ৳42,999  │ This page   │  →           │     │
│  │ Pickaboo  │ ৳39,900  │ ✓ ৳3,099 ↓  │  Open →      │     │
│  │ Cartup    │ ৳41,500  │ ৳1,499 ↓    │  Open →      │     │
│  └───────────┴──────────┴─────────────┴──────────────┘     │
│                                                            │
│  🎟  Coupons (3)  ·  🔍 Better alternatives (3)            │
└────────────────────────────────────────────────────────────┘
```

### Compare Page `/compare/[id]`

Side-by-side card grid, one column per platform, sorted by price ascending. Each card shows: image, title, price, verdict label, deep link, match confidence chip.

### Dashboard `/dashboard`

```
┌────────────────────────────────────────────────────────────┐
│  My Tracked Products (12)        [+ Add by URL]            │
├────────────────────────────────────────────────────────────┤
│  ✅  Samsung A55      ৳39,500  GOOD_DEAL  ↓ from ৳42,999   │
│  🔔  iPhone 15        ৳98,900  FAIR_PRICE  Alert: ৳95,000  │
│  ❌  Macbook Air M3   ৳149,900 FAKE_DISCOUNT                │
│  ...                                                       │
├────────────────────────────────────────────────────────────┤
│  My Alerts (3 / 3 — Free tier)        [ Upgrade ]          │
│  • iPhone 15 — Notify at ৳95,000 — Email                   │
│  • Sony WH-1000XM5 — Notify at ৳28,000 — Email             │
│  • Chaldal Pran Mustard 1L — Notify at ৳225 — Email        │
└────────────────────────────────────────────────────────────┘
```

### Component Reuse

`PriceChart.tsx` and `PriceAlertModal.tsx` already serve both extension and web. Build the chart once, render on both surfaces.

### Bengali UI

Phase 2. Toggle in header. All strings via `next-intl`. In-house initial translation; community-corrected via inline "report bad translation" link.

---

## 20. UX Flow & Aha Moments

### Four Aha Moments

| # | Moment | Surface | Feature |
|---|---|---|---|
| 1 | "❌ FAKE DISCOUNT — this was cheaper last week" | Extension popup on Daraz product | §7.2 Fake-discount detector |
| 2 | "৳3,200 cheaper on Pickaboo right now" | Extension popup + web product page | §9.2 Cross-platform compare |
| 3 | "✓ Saved ৳450 with bKash code at checkout" | Extension on Daraz cart page | §8.2 Auto-apply coupons |
| 4 | "We have 18 months of price history despite you just installing" | Extension + web product page | §15.2 Wayback backfill |

Each one is the product's reason for existing. They must be:
- **Instant** — verdict loads < 1s in extension, < 1.5s on web
- **Prominent** — never below the fold
- **Simple** — one label, one number, one clear next action

### The Full User Journey (MVP)

```
[User browses Daraz during 11.11 sale]
       ↓
[Opens product page]
       ↓
[Extension activates automatically; inline widget appears in <1s]
       ↓
[Verdict: ❌ FAKE DISCOUNT — Deal Score 2/10
  "Price is ৳2,000 ABOVE its 30-day average"
  "৳3,200 cheaper on Pickaboo right now"]
       ↓
[User clicks "Compare on Pickaboo"]
       ↓
[damkoi.xynly.com/compare/[id] opens with side-by-side]
       ↓
[User sets alert: "Notify me at ৳38,000"]
       ↓
[User does NOT buy now — saved from fake deal]
       ↓ (2 weeks later)
[Email: "🎉 Samsung A55 dropped to ৳37,500 — all-time low!"]
       ↓
[User clicks → buys → DamKoi auto-applies bKash code → user saves another ৳200]
```

Discover → verify → wait → buy → save more. The full loop is the product.

### UX Principles

- **Zero-friction tracking.** No login required for first alert.
- **One verdict, instantly.** Not five metrics — one label, one score, one number.
- **Transparent data.** Always show "tracked since [date]" and "X data points." Never fake authority.
- **Never cry wolf.** Only label something FAKE_DISCOUNT when data is statistically significant. False positives destroy trust faster than anything else.

---

## 21. Success Metrics

### North Star — Updated

> **Decisions influenced per week** = verdict views + alerts triggered + cross-platform compares + coupon auto-applies.

This replaces v2's "products tracked per week." It captures the multi-surface, multi-feature reality: a user we save from a fake deal is as valuable as a user who sets an alert.

### Activation Metrics

| Metric | Definition | Target (Day 90) |
|---|---|---|
| Extension installs | Total Chrome Web Store + Firefox installs | 5,000 |
| Web `damkoi.xynly.com` MAU | Unique monthly visitors | 15,000 |
| Activation rate (extension) | % installs who view ≥1 verdict | > 50% |
| Activation rate (web) | % MAUs who paste a URL or set an alert | > 25% |
| Time to first verdict | Install to first verdict shown | < 60s |

### Engagement Metrics

| Metric | Target (Day 90) |
|---|---|
| DAU (extension) | 1,500 |
| DAU (web) | 800 |
| Alerts set (total active) | 8,000 |
| Coupon auto-apply rate | > 30% of cart-page visits on supported platforms |
| Cross-platform compare CTR | > 15% on product pages with 2+ platform matches |
| Deal-feed CTR (web) | > 8% |

### Retention Metrics

| Metric | Target (Day 90) |
|---|---|
| D7 retention (extension) | > 30% |
| D30 retention (extension) | > 18% |
| D7 retention (web) | > 12% |
| Alert email open rate | > 50% |
| Alert email CTR | > 25% |

### Per-Platform Metrics

| Metric | Target (Day 90, per platform) |
|---|---|
| Active products tracked | Daraz: 50K · Cartup: 10K · Rokomari: 15K · Pickaboo: 8K · Chaldal: 5K |
| Verdict accuracy (manual sample) | > 95% |
| Scraper uptime | > 98% |

### Value Signal Metrics — the most important

| Metric | How measured |
|---|---|
| "Avoided bad deal" events | User viewed FAKE_DISCOUNT → did not click Buy (within 30 min) |
| "Good deal" conversions | User viewed GOOD_DEAL/BEST_PRICE → clicked Buy (with optional affiliate) |
| Alert conversions | Alert triggered → user opens email → buys within 48h |
| Cross-platform savings | ∑ (anchor price − chosen platform price) when compare is used |
| Coupon auto-apply savings | ∑ (cart total − discounted total) per session |

---

## 22. Go-To-Market Strategy

### Channel 1 — Facebook Groups (Day 1)

Bangladesh's deal discovery happens on Facebook. 50K–500K-member groups are exactly the ICP.

**Target groups:**
- "Daraz Deals BD"
- "BD Online Shopping"
- "Tech Deals Bangladesh"
- University groups (BUET, DU, NSU, BRAC, IUT, CUET)

**Post that works:**
```
Tested this Daraz "40% OFF" item with DamKoi. Turns out the price
is HIGHER than it was last month 😳

[Image: DamKoi popup showing FAKE DISCOUNT verdict + 90-day chart]

Bonus: it's ৳3,200 cheaper on Pickaboo right now.

Try it: damkoi.xynly.com
```

Educational, outrage-triggering, visual proof, multi-platform reveal.

### Channel 2 — TikTok / Instagram Reels

**Series: "Daraz Scam Exposed" + "Pickaboo vs Daraz"**

Format (30–60s):
1. Open a "50% OFF" Daraz product
2. DamKoi extension activates
3. Verdict: ❌ FAKE DISCOUNT
4. Cut to web compare: "৳5,000 cheaper on Pickaboo"
5. Text overlay: "Don't get fooled. Use DamKoi."

3x/week for first 90 days. One viral video drives thousands of installs.

### Channel 3 — Campus Launch

BUET, DU, NSU, BRAC University, IUT (Dhaka), CUET (Chattogram). 1–2 student ambassadors per campus. "Spot the Fake Deal" challenge → screenshot a Daraz "sale" → run DamKoi → share verdict. Winners featured on campus pages. Ambassadors get DamKoi swag + early premium access.

### Channel 4 — Telegram Deal Channel

Auto-posts products with `deal_score >= 8` from any platform.

- 5–8 deals/day
- Format: image + verdict + "Deal Score 9/10 ✅ — ৳X below 30-day avg — Buy: [link]"
- Cross-post best deals to FB groups
- Channel grows passively; each post drives installs

### Channel 5 — SEO (Programmatic)

Every `damkoi.xynly.com/product/[id]` page is server-rendered, indexable, and titled for long-tail BD price queries. Top-1000 product programmatic SEO target keywords:

- "Samsung Galaxy A55 price history Bangladesh"
- "iPhone 15 Daraz vs Pickaboo"
- "Best price Chaldal rice 5kg"
- "Pran mustard oil price comparison"

This is a slow-build moat — months to compound — but once it does, organic Google traffic becomes a permanent acquisition channel competitors can't buy their way past.

---

## 23. Monetization

> **Repositioned in v3.0:** Affiliate revenue is demoted to *supplementary*. Lead with brand display ads + sponsored deals + premium tier + B2B API. We follow BuyHatke's ad-funded model because BD affiliate programs are too immature and inconsistent to be a primary revenue lever.

### Phase 1 — Free, Now (Months 1–3)

No monetization. Focus entirely on growth, trust-building, and platform coverage. Revenue comes after install volume and per-platform depth are credible.

### Phase 2 — Brand Ads + Sponsored Deals (Months 3–6)

- **Brand display ads** on `damkoi.xynly.com` (deals feed, product page sidebars). Targeted by category and platform.
- **Sponsored placements** in deals feed (clearly labeled "Sponsored"). Brands pay for visibility, not for verdict manipulation.
- **Affiliate links** where BD programs exist (Daraz affiliate, Pickaboo affiliate). **Always disclosed.** Affiliate commission **never affects the verdict label or deal score.** Affiliate is a "yes if available" lever, not a strategy.
- Target: ৳100,000–300,000/month by Month 6.

### Phase 3 — Premium Tier (Months 6–9)

| Feature | Free | Premium (৳199/month) |
|---|---|---|
| Active price alerts | 3 | Unlimited |
| Alert channels | Email | Email + Telegram + Push + WhatsApp (Phase 3) |
| Price history depth | 90 days | Full history (incl. all Wayback) |
| Cross-platform compare | Top 3 platforms | All platforms |
| Early deal access | No | Yes — 1 hour before Telegram channel |
| CSV export | No | Yes |
| Bengali AI review summary | No | Yes (Phase 2) |

Soft launch at Day 60–90; hard launch when install base ≥ 5K.

### Phase 4 — B2B Pricing API (Months 9–12)

Sell price intelligence to:
- Sellers monitoring competitor pricing on Daraz / Pickaboo / Chaldal
- Research firms studying BD e-commerce
- Journalists / consumer rights organizations
- Hedge funds modeling BD inflation via grocery basket prices

Pricing: ৳5,000–25,000/month per customer based on call volume.

### Revenue Mix (Aspirational)

| | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Brand ads + sponsored | 50% | 45% | 35% |
| Premium subscriptions | 20% | 35% | 35% |
| Affiliate (supplementary) | 25% | 10% | 5% |
| B2B API | 5% | 10% | 25% |

### Why Not Affiliate-First (the BuyHatke Lesson)

BuyHatke explicitly chose feature parity over affiliate revenue when Amazon blocked their affiliate ID for showing price graphs. They picked user trust over commission. We do the same. The BD affiliate landscape is also smaller and less reliable than India's — leaning on it is fragile. Brand ads + premium scale better with our user base.

---

## 24. 90-Day Roadmap

> *This PRD describes a product that already ships. The roadmap is expansion, not bootstrap.*

### Day 0 — Done

- ✅ Daraz scraper (Playwright stealth + UA rotation + `__NEXT_DATA__` extraction)
- ✅ Wayback Machine backfill
- ✅ Sitemap harvester
- ✅ Verdict engine (5 labels + 1–10 deal score, 100% manual-tested accuracy on 50 SKUs)
- ✅ Coupon engine (platform + product, 2h refresh)
- ✅ Chrome extension MV3 (inline widget + sidebar + popup)
- ✅ Email alerts via Resend
- ✅ Anonymous tracking via `anon_id`
- ✅ Supabase auth
- ✅ Sentry + Telegram ops
- ✅ Web app scaffolded at `damkoi.xynly.com`

### Days 1–30 — Multi-Platform Foundation

| Week | Deliverable |
|---|---|
| 1 | Cartup scraper + adapter contract finalized |
| 2 | Rokomari scraper (low difficulty, fast win) |
| 2 | `damkoi.xynly.com` homepage live (paste URL + deals carousel) |
| 3 | Pickaboo scraper |
| 3 | Web `/product/[id]` page fully live |
| 4 | Web `/dashboard` + `/alerts` pages live; deals feed v2 (cross-platform) |
| 4 | Chrome Web Store submission (if not already approved) |

**Done when:** All 4 platforms live; web app fully functional; 1,000 installs.

### Days 31–60 — Cross-Platform Intelligence

| Week | Deliverable |
|---|---|
| 5 | Chaldal scraper |
| 5 | Matching engine V2 (rapidfuzz) live |
| 6 | `/compare/{id}` endpoint + web compare page |
| 7 | Coupon auto-apply MVP on Daraz checkout |
| 8 | Bengali UI MVP toggle |

**Done when:** Cross-platform compare works on 4 platforms; auto-apply ships on Daraz; Bengali users have a usable experience.

### Days 61–90 — Polish + Premium

| Week | Deliverable |
|---|---|
| 9 | Othoba scraper (5th platform) |
| 9 | Auto-apply on Pickaboo + Foodpanda |
| 10 | Deals feed v3 (filterable by platform/category/score) |
| 11 | Premium tier soft-launch (₹199/mo equivalent — ৳199) |
| 12 | AI layer prototype (Product Lens MVP for top 100 SKUs) |

**Done when:** 5 platforms live; auto-apply on 3 platforms; premium has paying users; AI prototype validated on top SKUs.

### Success Bar at Day 90

- 5,000+ extension installs
- 15,000 monthly visitors on `damkoi.xynly.com`
- 8,000 active alerts
- ≥ 95% verdict accuracy across all 5 platforms
- ≥ 100 paying premium subscribers (validates pricing)

---

## 25. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Daraz blocks scrapers | High | Critical | Playwright stealth + proxy rotation; DOM + JSON fallback selectors; raw HTML stored 48h for debug |
| Per-platform scraper fragility multiplies risk | High | High | Adapter pattern as failure isolation: one platform breaking does not affect others. Telegram alert per platform |
| Scraper breaks on UI change (any platform) | High | Medium | Automated parse-success monitoring per platform; Sentry alerts; release health dashboard |
| Verdict false positives (FAKE_DISCOUNT when not) | Medium | High | Minimum 5 data points / 14 days; confidence float; user "report wrong" button |
| Cross-platform match errors | Medium | Medium | 82% confidence threshold; admin merge/split tool; user "report wrong match" feedback |
| Coupon auto-apply breaks platform ToS | Medium | High | Auto-apply gated on user opt-in only; never auto-checkout; one-click copy fallback when injection unsafe; per-platform legal review before launch |
| Low initial user adoption (web side) | Medium | High | SEO programmatic + FB groups + TikTok from Day 1; Telegram channel grows organically |
| Ad-revenue dependent on BD brand budgets | Medium | Medium | Premium tier as parallel revenue lever; B2B API as Phase 4 hedge |
| WhatsApp Business API approval delayed | Medium | Low | Email + Telegram + Push ship first; WABA Phase 3 |
| Legal challenge from any platform | Low | High | Public-data-only scraping; attribution; no login bypass; no auto-checkout; consult BD lawyer before each new platform launch |
| Competitor copies idea | Low | Medium | First-mover speed; Wayback backfill is a structural moat; trust takes time to copy |
| Web SEO competition (BD content farms) | Medium | Low | Programmatic SEO depth; per-product canonical pages; structured data markup |

### Legal Posture (Multi-Platform)

- **Public-data-only scraping.** No login bypass, no auth tokens, no cart manipulation without user consent.
- **Attribution everywhere.** Every product page links back to the source platform.
- **Auto-apply requires opt-in.** Never default-on.
- **Per-platform legal sanity check** before each new scraper goes live.
- **Privacy:** anon_id stored locally; no PII without sign-up; Spend Lens (Phase 3) requires explicit forwarded-email opt-in.

---

## 26. Strategic Moat

### Layer 1 — Wayback Backfill (Short-Term Moat)

Months of Daraz price history at zero scraping cost. A competitor starting today has zero historical data. We have months. **The longer we run, the further they fall behind.** Wayback works for any platform with archive.org coverage; expanding to Cartup/Pickaboo extends the moat.

### Layer 2 — Multi-Platform First-Mover (Medium-Term Moat)

By Day 90, DamKoi runs on 5 BD platforms with per-platform scrapers, normalized data, and cross-platform matching. Building this from scratch takes 3–6 months minimum. Anyone catching up has to also build the data history we already have.

### Layer 3 — Trust (Medium-Term Moat)

If DamKoi flags 1,000 fake discounts and is right 950+ times, it becomes the trusted authority on BD pricing. **Trust is scarce in BD e-commerce. Trust is worth more than any single feature.** Trust takes months to earn and seconds to lose — protect verdict accuracy obsessively.

### Layer 4 — Bengali-Native AI (Long-Term Moat)

When DamKoi has:
- 2 years of price history across 8+ platforms
- Bengali sentence embeddings trained on BD product titles
- A community of users reporting fake deals and bad matches
- Brand recognition: "Check DamKoi before you buy"

...it becomes the **Google Maps of BD shopping decisions** — the authoritative layer every smart shopper consults before buying. At that point, DamKoi is not a price tracker. It's infrastructure for Bangladeshi consumer trust.

---

## 27. Open Questions

### Closed (Resolved Since v2)

| # | Question | Resolution |
|---|---|---|
| Q3 (v2) | Minimum data points before showing verdict? | **5 points / 14 days.** Live in `verdict.py`. |
| Q4 (v2) | Inline widget (always visible) vs popup-only? | **Both ship.** Inline widget on product page + full popup on icon click. |
| Q5 (v2) | Web dashboard simultaneously with extension or extension-only? | **Co-equal.** `damkoi.xynly.com` is first-class in v3. |

### Open

| # | Question | Decision Needed By | Owner |
|---|---|---|---|
| 1 | Coupon auto-apply ToS posture per platform? Need legal review for each. | Day 30 (before Daraz auto-apply ships) | Founder + lawyer |
| 2 | Bengali UI translation strategy — in-house, agency, or community-corrected? | Day 60 (before Bengali UI ships) | Product |
| 3 | Premium tier launch trigger — install count, alert count, or fixed date? | Day 60 (before soft-launch) | Founder |
| 4 | Mobile app build — start at Day 90 or Day 180? | Day 75 | Founder |
| 5 | Daraz BD affiliate API — does it provide pricing data we could use instead of scraping? | Day 30 | Tech |
| 6 | BSP for WhatsApp alerts (360dialog, WATI, Twilio)? | Phase 3 prep | Product |
| 7 | Multi-seller-on-same-product handling (Daraz different sellers, different prices)? | Day 45 | Tech |
| 8 | BD consumer-rights or tech-journalism contact who would write about fake-discount problem? | Day 30 | Marketing |

### One Founder-Must-Decide Callout

> **When does premium launch?** The trade-off: launch too early and you alienate a small free base; launch too late and you leave money on the table while burn rate climbs. Recommendation: soft-launch at 5K installs (Day 75–90), hard-launch at 10K installs (Day 120–150). Decision required by Day 60.

---

*Document End — DamKoi PRD v3.0 (Multi-Platform Repositioning)*

**Guiding principle for every decision:**
> *Build BuyHatke for Bangladesh. Trust beats features. Data beats opinions. Every shipped platform compounds the moat.*
