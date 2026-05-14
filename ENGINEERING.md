# DamKoi — Engineering Guide

Quick-start for developing on the DamKoi codebase.

## Architecture

```
backend/          FastAPI (Python 3.11+) on Vercel serverless
  app/
    routers/      API endpoints (products, alerts, tracking, auth)
    services/     Business logic (verdict, coupons, alternatives, mailer, flags)
    models/       SQLAlchemy models (7 Alembic-migrated tables)
    scraper/      Per-platform adapters + scheduler + Wayback backfill
      base.py         ScrapedProduct dataclass (shared across all scrapers)
      registry.py     Platform registry (URL patterns, scraper refs, flags)
      daraz_scraper.py  Live Daraz adapter (Playwright + stealth)
      utils.py        URL detection + ID extraction for all platforms

extension/        Chrome Extension (Manifest V3)
  content.js      Injected on product pages — inline widget + sidebar
  popup.js        Extension popup UI
  background.js   Service worker — API calls + caching

web/              Next.js 16 + React 19 + Tailwind 4
  src/app/        App Router pages
  src/components/ Shared components (PriceChart, PriceAlertModal)
  src/lib/        API client, utils
```

Production note: Vercel serverless does not keep in-process schedulers alive.
Use the authenticated `/cron/*` routes plus Vercel Cron/Supabase scheduled jobs
for alerts, coupons, matching, digest, cleanup, and backfill. Browser-based
scrapers need a Playwright-capable worker/runtime.

## Running Locally

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your keys
playwright install chromium
uvicorn app.main:app --reload --port 8000
```

### Extension
```bash
cd extension
npm install
npm run build           # esbuild bundles
# Load unpacked in chrome://extensions (Developer Mode → Load Unpacked → select extension/)
```

### Web
```bash
cd web
npm install
npm run dev             # Next.js dev server at localhost:3000
```

## Adding a New Platform

1. **Create scraper:** `backend/app/scraper/<platform>_scraper.py`
   - Expose `async def fetch(url: str) -> ScrapedProduct`
   - Import `ScrapedProduct` from `app.scraper.base`
   - Set `platform="<name>"` on the returned dataclass

2. **Register platform:** Add entry in `backend/app/scraper/registry.py` → `PLATFORMS` dict

3. **Enable flag:** Add platform name to `ENABLED_PLATFORMS` env var

4. **Add URL patterns:** Update `backend/app/scraper/utils.py` → `detect_platform_and_id()`

5. **Extension support:** Add content_script matches in `extension/manifest.json`

6. **QA:** Run 50-SKU test suite for the new platform

## Running Tests

```bash
cd backend
source venv/bin/activate
pytest -x --tb=short                    # all tests
pytest tests/scraper/ -v                # scraper tests only
pytest tests/services/test_verdict.py   # verdict logic only
```

## Environment Variables

See `backend/.env.example` for the full list. Key vars:
- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis for caching
- `ENABLED_PLATFORMS` — comma-separated: `daraz,cartup,rokomari`
- `SENTRY_DSN`, `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`
- `ADMIN_TOKEN` — protects `/admin/*`
- `CRON_SECRET` — protects `/cron/*`

## Conventions

- **All prices in paisa** (1 BDT = 100 paisa)
- **Append-only price history** — never UPDATE a price_snapshot
- **Source-tagged snapshots** — `live` or `wayback`
- **PR titles** prefixed with task ID: `[A.2] Rokomari scraper`
