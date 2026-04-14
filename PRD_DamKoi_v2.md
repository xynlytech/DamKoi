# Product Requirements Document
## DamKoi — Bangladesh Shopping Intelligence Platform

**Version:** 2.0 (Bulletproof Edition)
**Date:** March 2026
**Status:** Active
**Author:** [Your Name]

---

## Table of Contents

1. [Product Vision & Core Insight](#1-product-vision--core-insight)
2. [The Problem](#2-the-problem)
3. [Target Users — Sharp ICP](#3-target-users--sharp-icp)
4. [Strategic Positioning](#4-strategic-positioning)
5. [MVP Scope — 30 Days](#5-mvp-scope--30-days)
6. [Feature Specifications](#6-feature-specifications)
7. [System Architecture](#7-system-architecture)
8. [Data Model](#8-data-model)
9. [Scraper Design](#9-scraper-design)
10. [API Design](#10-api-design)
11. [Chrome Extension Design](#11-chrome-extension-design)
12. [UX Flow & Aha Moment](#12-ux-flow--aha-moment)
13. [Matching Engine — V1 to V2](#13-matching-engine--v1-to-v2)
14. [Success Metrics](#14-success-metrics)
15. [30-Day Execution Plan](#15-30-day-execution-plan)
16. [Go-To-Market Strategy](#16-go-to-market-strategy)
17. [Monetisation Roadmap](#17-monetisation-roadmap)
18. [Platform Expansion Roadmap](#18-platform-expansion-roadmap)
19. [Risks & Mitigations](#19-risks--mitigations)
20. [Strategic Moat](#20-strategic-moat)
21. [Open Questions](#21-open-questions)

---

## 1. Product Vision & Core Insight

### Vision

Build the **shopping intelligence layer for Bangladesh** — a tool that does not just show prices, but tells users whether to buy now or wait, flags fake discounts, and becomes the trusted source they check before every online purchase.

### Core Insight

> **Trust is broken in Bangladeshi e-commerce.**

Sellers routinely inflate base prices before sales (Eid, 11.11, Pahela Baishakh) and then show large "discount" badges on prices that are the same as or higher than normal. Shoppers know this is happening but have no tool to prove it or protect themselves.

**DamKoi fixes trust.** Every feature must serve this mission.

### One-Line Pitch

*"DamKoi tells you if a Daraz discount is real — or a scam."*

---

## 2. The Problem

### User Pain Points

**Fake discounts are endemic.**
During sale events, sellers inflate the "original price" then show a 40–60% discount badge. Shoppers have no historical data to verify whether the displayed price is genuinely lower than usual.

**Manual price research is exhausting.**
Users currently screenshot prices, check manually across tabs, or ask in Facebook groups — "Is this price good?" This is a solved problem in India (BuyHatke), USA (CamelCamelCamel), and Europe (PriceSpy). Bangladesh has nothing.

**No alerts system exists.**
A shopper who wants to wait for a product to hit ৳12,000 has to manually check every day. There is no automated way to be notified of a price drop on any Bangladeshi platform.

**Cross-platform comparison is impossible.**
A product on Daraz may be 20–30% cheaper on Pickaboo or Rokomari. Shoppers don't know without opening each site individually.

### Market Validation Signal

Search for "Daraz price history Bangladesh" or "Daraz fake discount" on Facebook → thousands of posts, complaints, and questions. The demand is proven. The tool just doesn't exist yet.

---

## 3. Target Users — Sharp ICP

### Primary Segment (MVP Focus)

**Profile:** Students and young professionals aged 18–35 in Dhaka, Chattogram, Sylhet

**Specific communities:**
- University students — BUET, DU, NSU, BRAC University, IUT
- Early-career professionals (first or second job)
- Tech-aware deal hunters active in Facebook deal groups

**Behavioral Traits (how they shop today):**
- Heavy Daraz users — browse daily, buy 2–4x per month
- Screenshot prices and compare manually across tabs
- Highly price-sensitive; will wait days or weeks for a deal
- Easily influenced by "Sale" and "X% OFF" labels
- Share deals with friends via WhatsApp and Facebook Messenger
- Trust peer recommendations over platform advertising

**Why they will use DamKoi:**
They already suspect fake discounts. DamKoi gives them proof — with a single number they can act on. It turns suspicion into decision.

### Secondary Segment (Phase 2)

**Small business owners & resellers**
- Buy in bulk from Daraz or Chaldal
- Need pricing trend data to time purchases
- Would pay for B2B pricing intelligence

**Deal community moderators**
- Run Facebook deal groups with 50K–500K members
- Will amplify DamKoi if it gives them a credible sourcing tool

---

## 4. Strategic Positioning

### What DamKoi Is NOT

- Not a price comparison site (those are passive)
- Not another Daraz clone
- Not a cashback app

### What DamKoi IS

**A decision engine.**

| Feature | What it does |
|---|---|
| Price History | Shows what the real price has been |
| Fake Discount Detector | Tells you if the current deal is real |
| Price Alert | Tells you when to buy |
| Smart Recommendations | Shows you a better option if one exists |

### Positioning Statement

For Bangladeshi online shoppers who are tired of being misled by fake discounts, DamKoi is the shopping intelligence tool that shows real price history and tells you whether to buy now or wait — unlike manual comparison or just trusting the platform's sale badge.

---

## 5. MVP Scope — 30 Days

### The Brutal Rule

> **ONE platform. ONE killer feature. Do it perfectly.**

**Platform:** Daraz only. Daraz is the dominant marketplace. Every feature works better with depth of data than breadth of platforms. Add platforms in Month 2 onwards.

**Killer Feature:** The Deal Score — a single, instant answer to "Is this a good deal?"

### MVP Feature List

| # | Feature | Priority | Why |
|---|---|---|---|
| 1 | Price History Graph | P0 | Core data; proves the fake discount |
| 2 | Fake Discount Detector | P0 | The hook; the viral moment |
| 3 | Price Drop Alerts | P0 | Retention driver; brings users back |
| 4 | URL-based Product Tracking | P0 | No login needed; zero friction |
| 5 | Similar Cheaper Items | P1 | Adds immediate value beyond history |
| 6 | Chrome Extension | P0 | Delivery mechanism — shows inside Daraz |
| 7 | Web Dashboard | P1 | For managing alerts; Phase 2 can wait |

### What is explicitly OUT of MVP

- Multi-platform support (Month 2)
- User accounts / login (Month 2 — growth hack to delay this)
- Mobile app (Month 4+)
- B2B pricing API (Month 9+)
- Bengali language UI (Month 3)
- WhatsApp alerts (Month 2 — pending WABA approval)

---

## 6. Feature Specifications

### 6.1 Price History Graph

**Description:** For any tracked Daraz product, display a time-series line chart of price over time, annotated with key events.

**User story:** *As a shopper looking at a Daraz product, I want to see how the price has changed over the past 90 days so I can tell whether today's "sale" price is genuinely low.*

**Functional requirements:**
- Display price history from first scrape date up to present
- Time range toggles: 7 days / 30 days / 90 days
- Annotate: all-time low, all-time high, current price
- Highlight sale event periods (manually tagged: Eid, 11.11, etc.)
- Show stock availability alongside price (in stock / out of stock)
- If less than 7 days of data exists: show available data with "tracking since [date]" label

**Display values (always visible):**
```
📉 Lowest Ever:   ৳12,500
📊 30-Day Avg:    ৳14,800
💰 Current Price: ৳16,200
```

---

### 6.2 Fake Discount Detector

**Description:** The flagship feature. A single verdict — displayed prominently — telling the user whether the current discount is real or inflated.

**User story:** *As a shopper who sees "40% OFF" on a Daraz listing, I want to know immediately whether this discount is real or whether the seller just inflated the original price.*

**Detection Logic (V1 — Rule-Based):**

```python
def get_deal_verdict(current_price, prices_last_30_days):
    if len(prices_last_30_days) < 5:
        return "INSUFFICIENT_DATA"

    avg_30d = mean(prices_last_30_days)
    all_time_low = min(prices_ever)

    discount_from_avg = (avg_30d - current_price) / avg_30d

    if current_price > avg_30d * 1.05:
        return "FAKE_DISCOUNT"       # Price is HIGHER than normal
    elif current_price <= all_time_low * 1.02:
        return "BEST_PRICE"          # At or near all-time low
    elif discount_from_avg >= 0.10:
        return "GOOD_DEAL"           # Genuinely 10%+ below average
    elif discount_from_avg >= 0.00:
        return "FAIR_PRICE"          # At or near normal price
    else:
        return "FAKE_DISCOUNT"       # Elevated vs. average
```

**UI Display:**

```
❌  FAKE DISCOUNT
    Price is ৳1,400 ABOVE the 30-day average.
    This is NOT a good time to buy.

✅  BEST PRICE — ALL-TIME LOW
    This is the lowest price we've ever tracked.
    Great time to buy!

🟡  FAIR PRICE
    Price is normal. No special deal right now.

🔥  GOOD DEAL
    Price is 15% below the 30-day average.
    One of the better prices we've seen.
```

**Deal Score (1–10):** A single number summarising the verdict for quick scanning.
- 9–10: All-time low or very close
- 7–8: Genuinely below average
- 5–6: Normal / fair price
- 3–4: Slightly elevated
- 1–2: Clearly fake / inflated discount

---

### 6.3 Price Drop Alerts

**Description:** Users set a target price; DamKoi notifies them when the product reaches it.

**User story:** *As a shopper who wants a specific phone but thinks ৳42,999 is too high, I want to be notified when the price drops to ৳38,000, so I can buy at the right moment without checking daily.*

**Functional requirements:**
- Set target price via extension popup or web dashboard
- No login required for first alert (store via browser local storage + anonymous user ID)
- Login required for 2nd alert onwards (growth lever)
- Notification channels: Email (Phase 1); Push via PWA + WhatsApp (Phase 2)
- Alert triggers: price drops below target, product hits all-time low, restocked after being out of stock
- Rate limit: one notification per product per 24 hours (no spam)
- Alert pause / reactivate from dashboard
- Free tier: 3 active alerts; Premium: unlimited

---

### 6.4 URL-Based Product Tracking

**Description:** Paste any Daraz product URL and immediately begin tracking it — no account required.

**Functional requirements:**
- Accept full Daraz product URL
- Auto-extract product ID from URL
- Begin scraping immediately (within 1 hour of submission)
- Return: current price, price history if already tracked, deal verdict
- "Track this product" saves it to user's tracked list (cookie/localStorage)
- Available on: web homepage, extension popup
- Handle URL variants: short URLs, affiliate URLs, URLs with UTM parameters

---

### 6.5 Similar Cheaper Items (Lite Recommendations)

**Description:** When a product is flagged as fake discount or overpriced, show similar cheaper alternatives from the same category on Daraz.

**V1 Rule-Based Logic:**
```python
def find_alternatives(product):
    candidates = products_in_same_category(product.category)
    candidates = filter(lambda p: p.current_price < product.current_price * 0.90, candidates)
    candidates = filter(lambda p: p.deal_score >= 6, candidates)
    return sorted(candidates, key=lambda p: p.deal_score, reverse=True)[:3]
```

**UI:** "Better alternatives found 👇" card below the deal verdict, showing up to 3 products with deal score, price, and image.

---

## 7. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   USER INTERFACES                         │
│   Chrome Extension  │  Web App (Next.js)  │  PWA (P2)    │
└────────┬───────────────────────┬──────────────────────────┘
         │                       │
         └──────────┬────────────┘
                    │
┌───────────────────▼──────────────────────────────────────┐
│              REST API — FastAPI (Python)                   │
│     Rate limited · HTTPS only · JSON responses            │
└──────┬─────────────────────┬────────────────┬────────────┘
       │                     │                │
┌──────▼──────┐   ┌──────────▼──────┐  ┌─────▼──────────┐
│ Product &   │   │  Alert Service   │  │  Auth Service  │
│ Price Svc   │   │  (Celery Tasks)  │  │  (Supabase)    │
└──────┬──────┘   └──────────┬───────┘  └────────────────┘
       │                     │
┌──────▼─────────────────────▼──────────────────────────────┐
│                      DATA LAYER                            │
│   PostgreSQL (products, price_history, alerts, users)      │
│   Redis (cache layer · Celery job queue)                   │
└──────────────────────────────┬────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────┐
│                   SCRAPER LAYER                            │
│   Playwright + Python · Celery workers                     │
│   Daraz scraper (MVP) → multi-platform (Phase 2)          │
└───────────────────────────────────────────────────────────┘
```

### Architecture Decisions & Rationale

| Decision | Choice | Why |
|---|---|---|
| Scraper | Playwright (Python) | Daraz is React SPA; Scrapy alone cannot render JS |
| Backend | FastAPI | Shares Python with scraper; fast to build; async native |
| DB | PostgreSQL | Time-series price data + relational users/alerts |
| Cache | Redis | Sub-10ms reads for price history; also used for job queue |
| Job queue | Celery + Redis | Reliable async scraping; retries on failure |
| Frontend | Next.js | SSR for SEO on web dashboard |
| Auth | Supabase | Managed auth; fast to integrate; generous free tier |
| Hosting (MVP) | Railway | Simple deploy; ~$20/month; upgrade to AWS later |

---

## 8. Data Model

### PostgreSQL Schema

```sql
-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform        VARCHAR(50) NOT NULL DEFAULT 'daraz',   -- 'daraz', 'rokomari', etc.
    external_id     VARCHAR(255) NOT NULL,                  -- platform's own product ID
    url             TEXT NOT NULL,
    title           TEXT NOT NULL,
    normalized_title TEXT NOT NULL,                         -- cleaned for matching
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
-- PRICE HISTORY (append-only, never update)
-- ============================================================
CREATE TABLE price_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    product_id      UUID REFERENCES products(id),
    price           INTEGER NOT NULL,                       -- in BDT paisa (avoid floats)
    original_price  INTEGER,                               -- "crossed out" price on page
    discount_pct    SMALLINT,                              -- as shown by platform
    in_stock        BOOLEAN DEFAULT TRUE,
    scraped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_price_history ON price_snapshots (product_id, scraped_at DESC);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20),
    anon_id         VARCHAR(255) UNIQUE,                   -- browser fingerprint for no-login tracking
    auth_provider   VARCHAR(50),                           -- 'email', 'google', 'facebook'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRACKED PRODUCTS (user wishlist)
-- ============================================================
CREATE TABLE tracked_products (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    anon_id         VARCHAR(255),                          -- for pre-login tracking
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
    target_price    INTEGER NOT NULL,                      -- in BDT paisa
    notify_via      VARCHAR(50)[] DEFAULT '{email}',       -- ['email', 'whatsapp', 'push']
    is_active       BOOLEAN DEFAULT TRUE,
    last_triggered  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALERT EVENTS (notification log)
-- ============================================================
CREATE TABLE alert_events (
    id              BIGSERIAL PRIMARY KEY,
    alert_id        UUID REFERENCES alerts(id),
    price_at_trigger INTEGER NOT NULL,
    channel         VARCHAR(50),
    sent_at         TIMESTAMPTZ DEFAULT NOW(),
    success         BOOLEAN DEFAULT TRUE
);
```

### Price Storage Convention

Store all prices as **integers in paisa** (1 BDT = 100 paisa). Avoids floating-point precision bugs. Display layer divides by 100.

---

## 9. Scraper Design

### Daraz Scraper (MVP)

**Challenge level:** High. Daraz is a React SPA protected by Akamai bot detection.

**Approach:**

```python
# Tool: Playwright with stealth plugin
# Library: playwright-stealth (Python)

async def scrape_daraz_product(url: str) -> ProductData:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1366, "height": 768},
            locale="en-US"
        )
        await stealth_async(context)
        page = await context.new_page()
        await page.goto(url, wait_until="networkidle")

        # Primary: extract from __NEXT_DATA__ JSON blob (more reliable than DOM)
        data = await page.evaluate("""
            () => JSON.parse(document.getElementById('__NEXT_DATA__').textContent)
        """)

        # Fallback: DOM selectors if JSON extraction fails
        price = extract_price_from_nextdata(data) or await page.locator(".pdp-price").text_content()
        title = extract_title_from_nextdata(data) or await page.locator(".pdp-title").text_content()

        return ProductData(price=price, title=title, ...)
```

**Anti-Detection Strategy:**

| Technique | Implementation |
|---|---|
| Stealth mode | `playwright-stealth` library |
| User-Agent rotation | Pool of 20 real browser UA strings |
| Request delays | Random 2–5s delay between requests |
| Proxy rotation | BrightData residential proxies (if blocked) |
| Session cookies | Persist cookies across requests per session |
| Crawl schedule | Off-peak hours (2am–6am BD time) for bulk scrapes |

**Product Discovery (how we find new products to track):**

1. User submits URL → immediate scrape + schedule
2. Daraz sitemap.xml → daily crawl of new product URLs
3. Daraz category pages → periodic crawl of top products per category

### Scrape Scheduling (Celery Beat)

```python
CELERYBEAT_SCHEDULE = {
    # High-priority: products with >10 active alerts or >100 daily views
    "scrape-hot-products": {
        "task": "scraper.tasks.scrape_product_batch",
        "schedule": crontab(minute=0),           # every hour
        "args": ("hot",)
    },
    # Normal: products tracked by at least 1 user
    "scrape-tracked-products": {
        "task": "scraper.tasks.scrape_product_batch",
        "schedule": crontab(hour="*/6"),          # every 6 hours
        "args": ("tracked",)
    },
    # Long-tail: all other tracked products
    "scrape-longtail-products": {
        "task": "scraper.tasks.scrape_product_batch",
        "schedule": crontab(hour=2, minute=0),    # daily at 2am
        "args": ("longtail",)
    },
    # Alert checking
    "check-price-alerts": {
        "task": "alerts.tasks.check_all_alerts",
        "schedule": crontab(minute="*/15"),       # every 15 minutes
    },
}
```

### Scraper Health Monitoring

- Alert via Telegram bot if any scraper fails > 3 consecutive times
- Log success rate, average scrape time, and error types per product
- Store raw HTML snapshot for 48 hours for debugging
- Auto-retry failed scrapes after 30 minutes (max 3 retries)

---

## 10. API Design

### Base URL

```
https://api.damkoi.com/v1
```

### Endpoints

```
# Product Lookup & History
GET  /products/lookup?url={encoded_daraz_url}
GET  /products/{product_id}
GET  /products/{product_id}/price-history?days=90
GET  /products/{product_id}/verdict          # fake discount verdict
GET  /products/{product_id}/alternatives     # similar cheaper items
GET  /products/search?q={query}&platform=daraz

# Deals Feed
GET  /deals?min_discount=20&category=electronics&sort=deal_score

# Alerts (auth required)
POST /alerts             body: { product_id, target_price, notify_via }
GET  /alerts             returns: user's active alerts
PUT  /alerts/{id}        body: { target_price?, is_active? }
DELETE /alerts/{id}

# Tracking (no auth — uses anon_id)
POST /track              body: { product_id, anon_id }
GET  /track?anon_id={id} returns: tracked products for anonymous user

# User
POST /auth/register
POST /auth/login
GET  /user/dashboard
```

### Sample Response: Product Lookup

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
    "current_price": 42999,
    "original_price": 49999,
    "platform_discount_pct": 14,
    "in_stock": true,
    "last_updated": "2026-03-24T10:30:00Z"
  },
  "verdict": {
    "deal_score": 3,
    "label": "FAKE_DISCOUNT",
    "display": "❌ NOT a real deal",
    "explanation": "Current price is ৳1,800 above the 30-day average.",
    "avg_30d": 41199,
    "all_time_low": 37500,
    "all_time_low_date": "2026-01-15"
  },
  "tracking_since": "2025-11-03T00:00:00Z",
  "data_points": 142
}
```

### Rate Limiting

| Tier | Limit |
|---|---|
| Anonymous | 30 requests / minute / IP |
| Authenticated | 120 requests / minute |
| Extension (per install) | 60 requests / minute |
| B2B API key | Custom |

---

## 11. Chrome Extension Design

### Why Extension First (Before Web Dashboard)

The extension **lives inside the user's Daraz browsing session**. The user doesn't have to remember to go to a separate site. It shows up exactly when they need it — at the moment of purchase decision. This is the correct delivery mechanism for the MVP.

### Extension Flow

```
1. User opens any Daraz product page
2. Content script detects page type (product page? Yes/No)
3. Extract from page DOM or __NEXT_DATA__:
   - Product title
   - Product ID (from URL or data attribute)
   - Current price
4. POST to DamKoi API: /products/lookup?url={current_url}
5. Receive: price history + verdict + alternatives
6. Inject floating widget OR show popup with results
```

### Extension UI — Popup Layout

```
┌─────────────────────────────────┐
│  🛒 DamKoi                [X]   │
├─────────────────────────────────┤
│  Samsung Galaxy A55 5G          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                 │
│  ❌ FAKE DISCOUNT               │
│  Deal Score: 3 / 10             │
│                                 │
│  Current:    ৳42,999            │
│  30-Day Avg: ৳41,200            │
│  Lowest Ever:৳37,500 (Jan 15)   │
│                                 │
│  [📉 See Full Price History]    │
│                                 │
│  ─────────────────────────────  │
│  🔔 Alert me at ৳[_______]     │
│             [Set Alert]         │
└─────────────────────────────────┘
```

### Extension Technical Specs

- **Manifest Version:** V3 (required for Chrome Web Store)
- **Permissions:** `activeTab`, `storage`, `alarms` (for local alert checks)
- **Content Security Policy:** Strict; only calls `api.damkoi.com`
- **Files:** `manifest.json`, `content.js`, `popup.html`, `popup.js`, `background.js`
- **Size target:** < 500KB total (fast install, low friction)
- **Local storage:** Cache last 10 product verdicts locally (50ms load if revisiting)
- **Supported browsers Phase 1:** Chrome, Edge (Chromium-based, same build)
- **Phase 2:** Firefox (requires MV2 compatibility layer)

### Extension Activation Logic

```javascript
// content.js — runs on every daraz.com.bd page load
const isDarazProductPage = () => {
    return window.location.hostname === 'www.daraz.com.bd'
        && window.location.pathname.includes('/products/');
};

if (isDarazProductPage()) {
    const productId = extractProductId(window.location.href);
    fetchDamKoiVerdict(productId).then(renderWidget);
}
```

---

## 12. UX Flow & Aha Moment

### The Aha Moment

The single most important UX moment is when a user sees:

```
❌ FAKE DISCOUNT
This item was cheaper last week.
```

...on a product that Daraz is showing as "40% OFF."

This moment is the product's reason for existing. It must be:
- **Instant** — verdict loads within 1 second
- **Prominent** — not buried below the fold
- **Simple** — one label, one number, one clear recommendation

### Full User Journey (MVP)

```
[User browses Daraz] 
        ↓
[Opens a product page during 11.11 sale]
        ↓
[DamKoi extension activates automatically]
        ↓
[Popup appears with Deal Score: 2/10]
[Label: ❌ FAKE DISCOUNT]
["Price is ৳2,000 ABOVE its 30-day average"]
        ↓
[User clicks "See Full Price History"]
        ↓
[Web page opens with full chart → spike visible right before sale]
        ↓
[User sets price alert: "Notify me at ৳38,000"]
        ↓
[User does NOT buy now — saved from fake deal]
        ↓ (2 weeks later)
[Email: "🎉 Samsung A55 dropped to ৳37,500 — all-time low!"]
        ↓
[User clicks → buys → DamKoi earns affiliate commission]
```

This full loop — discover → verify → wait → buy — is the core product experience.

### UX Principles

- **Zero-friction tracking.** No login to track a product. Just paste the URL.
- **One verdict, instantly.** Not 5 metrics — one label and one score.
- **Transparent data.** Always show "tracked since [date]" and "X data points." Don't fake authority.
- **Never cry wolf.** Only label something "FAKE DISCOUNT" if data supports it confidently. False positives destroy trust faster than anything.

---

## 13. Matching Engine — V1 to V2

Cross-platform product matching (used from Phase 2 onwards when multiple platforms are live) is the hardest algorithmic problem and the most defensible moat.

### V1 — Rule-Based (MVP, Daraz only)

Within Daraz, products have unique IDs. No matching needed. V1 is trivially `product.external_id == scraped_external_id`.

### V2 — Fuzzy String Matching (Phase 2, multi-platform)

When Rokomari and Pickaboo are added:

```python
from rapidfuzz import fuzz

def match_products(product_a, product_b) -> float:
    title_score = fuzz.token_sort_ratio(
        normalize_title(product_a.title),
        normalize_title(product_b.title)
    ) / 100.0

    # Model number exact match is a strong signal
    model_bonus = 0.3 if product_a.model_number == product_b.model_number else 0.0

    return min(title_score + model_bonus, 1.0)

def normalize_title(title: str) -> str:
    title = title.lower()
    title = re.sub(r'[^\w\s]', '', title)      # remove punctuation
    title = re.sub(r'\b(free|shipping|official)\b', '', title)  # remove noise words
    return title.strip()

MATCH_THRESHOLD = 0.82    # only show comparison if confidence >= 82%
```

### V3 — Semantic Embeddings (Phase 3, moat)

```python
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
# ^ Supports Bengali text natively

def embed_and_match(titles: list[str]) -> np.ndarray:
    embeddings = model.encode(titles)
    return cosine_similarity(embeddings)
```

This handles:
- Bengali ↔ English title variants
- Abbreviations ("SM-A556E" → "Samsung A55")
- Sellers who reword titles to obscure matching

This embedding layer, trained on BD e-commerce data, becomes the moat competitors cannot easily copy.

---

## 14. Success Metrics

### North Star Metric

**Products tracked per week** — a proxy for active, engaged users who trust the data.

### Activation Metrics

| Metric | Definition | Target (Day 30) |
|---|---|---|
| Extension installs | Total Chrome Web Store installs | 1,000 |
| Activation rate | % installs who track ≥1 product | > 40% |
| Time to first verdict | Time from install to seeing first deal score | < 60 seconds |

### Engagement Metrics

| Metric | Definition | Target (Day 30) |
|---|---|---|
| DAU | Daily active users (extension opens) | 500 |
| Alerts set | Total active price alerts | 2,000 |
| Alerts per active user | Avg alerts per engaged user | > 2 |
| Return visits | Users who open extension 3+ days in a week | > 30% |

### Retention Metrics

| Metric | Target |
|---|---|
| D7 retention | > 25% |
| D30 retention | > 15% |
| Alert click-through | > 50% of alert emails opened |

### Value Signal Metrics (the most important)

| Metric | How to measure |
|---|---|
| "Avoided bad deal" events | User viewed a FAKE_DISCOUNT verdict AND did not click Buy |
| "Good deal" conversions | User viewed GOOD_DEAL/BEST_PRICE AND clicked affiliate Buy link |
| Alert conversions | Alert triggered → user buys within 48 hours |

---

## 15. 30-Day Execution Plan

### Week 1 — Foundation (Days 1–7)

**Goal:** Raw price data flowing into the database.

- Set up PostgreSQL + Redis on Railway
- Build Daraz product scraper (Playwright)
- Implement scrape scheduling with Celery
- Seed with 10,000 Daraz product URLs from sitemaps
- Store first price snapshots
- Write unit tests for scraper + data extraction

**Done when:** 10,000 products scraped with valid price data. No corrupted records.

---

### Week 2 — Core Logic (Days 8–14)

**Goal:** The intelligence layer is working.

- Build price history API endpoint
- Implement fake discount detector algorithm
- Implement deal score calculation (1–10)
- Write price alert check task (Celery)
- Build email notification template + SendGrid integration
- Manual QA: test 50 products, validate verdict accuracy

**Done when:** Fake discount detector gives accurate results on 48+ of 50 manually-tested products.

---

### Week 3 — Frontend (Days 15–21)

**Goal:** The Chrome extension is usable by real humans.

- Build Chrome extension (Manifest V3)
- Content script: detect Daraz product pages, extract data
- Popup UI: Deal Score, price breakdown, alert setter
- Web page: full price history chart (Next.js + Recharts)
- Basic web homepage with URL paste input
- Load test: extension calls API on 100 simultaneous users

**Done when:** 5 non-technical people can install extension and understand the verdict without explanation.

---

### Week 4 — Polish + Beta Launch (Days 22–30)

**Goal:** Ship to first 100 real users.

- Fix bugs from internal testing
- Add "Similar Cheaper Items" feature
- Set up error monitoring (Sentry)
- Set up scraper health alerts (Telegram bot)
- Chrome Web Store submission (allow 3–5 days for review)
- Soft launch in 2 Facebook deal groups
- Collect and triage user feedback daily

**Done when:** 100 installs. First 10 alert emails sent. Zero critical bugs in 48 hours.

---

## 16. Go-To-Market Strategy

### Channel 1: Facebook Groups (Day 1)

Bangladesh's deal discovery happens on Facebook. These groups have 50K–500K members who are exactly the ICP.

**Target groups:**
- "Daraz Deals BD"
- "BD Online Shopping"
- "Tech Deals Bangladesh"
- University Facebook groups (BUET, DU, NSU, BRAC)

**Post format that works:**
```
"Tested this Daraz '40% OFF' item with a new tool called DamKoi —
turns out the price is actually HIGHER than it was last month 😳
Screenshot below 👇

[Image: DamKoi popup showing FAKE DISCOUNT verdict]

Link: damkoi.com
```

This post works because: it is educational, it triggers outrage, it includes visual proof, and the tool is the hero.

---

### Channel 2: TikTok / Instagram Reels

**Content series: "Daraz Scam Exposed"**

Video format (30–60 seconds):
1. Open a "50% OFF" Daraz product
2. Show DamKoi extension activating
3. Verdict appears: ❌ FAKE DISCOUNT
4. Show the price chart — price spike right before the sale
5. Text overlay: "Don't get fooled. Use DamKoi."

This format has extremely high viral potential in Bangladesh. One good video can drive thousands of installs.

**Post frequency:** 3x per week for first month.

---

### Channel 3: Campus Launch

**Target:** BUET, DU, NSU, BRAC University (Dhaka), CUET (Chattogram)

**Approach:**
- Find 1–2 student ambassadors per campus via existing network
- Run "Spot the Fake Deal" challenge: screenshot a Daraz "sale" product → use DamKoi → share verdict
- Winning post gets shared on university meme/deal pages
- Ambassadors get DamKoi swag + early premium access

**Why campus:** University students are early adopters with high social network density. One viral post in a university group reaches 5,000–20,000 people instantly.

---

### Channel 4: Telegram Deal Channel

Launch a "DamKoi Deals" Telegram channel that auto-posts products where `deal_score >= 8` (genuine, verified deals). 

- Post 3–5 deals per day
- Format: product image + "Deal Score 9/10 ✅ — ৳X below 30-day average — Buy: [link]"
- Cross-post best deals to Facebook groups
- Channel grows passively; each deal post drives installs

---

## 17. Monetisation Roadmap

### Phase 1 (Month 1–3): Free

No monetisation. Focus entirely on growth and trust-building. Revenue comes later.

### Phase 2 (Month 3–6): Affiliate Commissions

- **Daraz Affiliate Program:** Earn 2–8% commission on purchases made through DamKoi "Buy Now" links
- **All affiliate links are clearly disclosed** ("We earn a small commission if you buy via our link. This never affects our price data.")
- Target: ৳50,000–200,000/month in affiliate revenue by Month 6

### Phase 3 (Month 6–9): Premium Tier

| Feature | Free | Premium (৳199/month) |
|---|---|---|
| Active price alerts | 3 | Unlimited |
| Alert channels | Email only | Email + WhatsApp + Push |
| Price history | 90 days | Full history |
| Early deal access | No | Yes (1 hour before Telegram) |
| Deal CSV export | No | Yes |

### Phase 4 (Month 9–12): B2B Pricing API

Sell price intelligence data to:
- Sellers who want to monitor competitor pricing on Daraz
- Research firms studying BD e-commerce
- Journalists / consumer rights organisations

Pricing: ৳5,000–৳25,000/month depending on usage.

---

## 18. Platform Expansion Roadmap

| Month | Platform | Scraper Difficulty | Notes |
|---|---|---|---|
| 1–2 | Daraz | High | MVP; Playwright required; Akamai protection |
| 2 | Rokomari | Low | Server-rendered PHP; Scrapy sufficient |
| 2 | Chaldal | Medium | Has internal API; scrape responses directly |
| 3 | Shajgoj | Low | WooCommerce; standard scraping |
| 3 | Pickaboo | Medium | Electronics focus; good for comparison |
| 4 | Ajkerdeal | Medium | General marketplace |
| 5 | Othoba | Medium | General marketplace |
| 6 | GhorerBazar | Medium | Grocery; compete with Chaldal comparison |
| 9 | Bikroy | High | Used goods; price history harder to define |

**Platform Priority Criteria:**
1. Traffic size (larger = more user value)
2. Scraper difficulty (lower = faster to ship)
3. Category coverage gap (does adding this platform add a new category?)

---

## 19. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Daraz blocks scrapers | High | Critical | Playwright stealth + proxy rotation; also check if Daraz affiliate API provides pricing; DOM + JSON fallback selectors |
| Scraper breaks on UI change | High | High | Monitor with automated tests; Sentry alerts on parse failures; store raw HTML for 48h to debug |
| Fake discount logic is wrong (false positives) | Medium | High | Only flag when data is statistically significant (minimum 5 data points over 14 days); show confidence level; let users report errors |
| Product matching errors (Phase 2) | Medium | Medium | Conservative threshold (82%); admin correction tool; user "report wrong match" button |
| Low initial user adoption | Medium | High | Facebook groups + TikTok content from Day 1; launch in Telegram channel first to build base |
| WhatsApp Business API approval delayed | Medium | Low | Email alerts ship first; WABA application submitted Week 1 |
| Legal challenge from Daraz | Low | High | Only scrape public pages; no login bypass; include attribution; consult a BD lawyer before launch |
| Competitor copies idea | Low | Medium | Speed + trust moat; first-mover advantage in BD; community loyalty harder to copy than features |

---

## 20. Strategic Moat

### Short-Term Moat (Month 1–6): Data

Every day we scrape, the price history database grows. A competitor starting today has zero historical data. We have months of history. **The longer we run, the more valuable the data.**

### Medium-Term Moat (Month 6–12): Trust

If DamKoi flags 100 fake discounts and is right 95 times, it becomes the trusted authority. Trust in BD e-commerce is scarce. Trust is worth more than any feature.

### Long-Term Moat (Year 1–2): The Intelligence Layer

When DamKoi has:
- 2 years of price history across 8 platforms
- Sentence embeddings trained on BD product titles
- Community of users reporting fake deals
- Brand recognition: "Check DamKoi before you buy"

...it becomes the **Google Maps of shopping decisions in Bangladesh** — the authoritative layer that every smart shopper consults before buying.

At that point, DamKoi is not a price tracker. It's infrastructure for Bangladeshi consumer trust.

---

## 21. Open Questions

| # | Question | Decision Needed By | Owner |
|---|---|---|---|
| 1 | Does Daraz BD's affiliate program provide product pricing via API? If yes, use instead of scraping. | Week 1 | Tech |
| 2 | Which WhatsApp Business Solution Provider (BSP) to use? Options: 360dialog, WATI, Twilio. Evaluate pricing for BD. | Week 2 | Product |
| 3 | What is the minimum number of price data points required before showing the Fake Discount verdict? Proposed: 5 points over 14 days. | Week 2 | Tech |
| 4 | Should the Chrome extension inject a floating widget on the page (always visible) or only show on icon click (less intrusive)? | Week 3 | Design |
| 5 | Should we launch web dashboard simultaneously with extension, or extension-only for Month 1? | Week 1 | Product |
| 6 | What legal structure is needed? Sole trader vs. company registration? Required for affiliate programs and WABA. | Week 2 | Founder |
| 7 | Is there a BD consumer rights or tech journalism contact who could write about the fake discount problem? | Week 3 | Marketing |
| 8 | How do we handle products where the seller on Daraz is a third-party, and different sellers have different prices for the "same" product? | Week 2 | Tech |

---

*Document End — DamKoi PRD v2.0 (Bulletproof Edition)*

**Guiding principle for every decision:**
> *Don't overbuild. Start with ONE platform, ONE killer feature. "Is this a good deal or not?" If you nail this → users will come back.*
