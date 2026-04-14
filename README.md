# DamKoi — Bangladesh Shopping Intelligence Platform

> *"DamKoi tells you if a Daraz discount is real — or a scam."*

A shopping intelligence tool for Bangladesh that shows real price history, detects fake discounts, and tells you whether to buy now or wait.

## 🏗️ Architecture

```
DamKoi Codebase/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── config.py        # Environment config
│   │   ├── database.py      # Async SQLAlchemy setup
│   │   ├── models/          # Database models
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   └── scraper/         # Daraz scraper + scheduler
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── extension/               # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── content.js           # Injected on Daraz pages
│   ├── popup.html/js/css    # Extension popup
│   └── background.js        # Service worker
├── web/                     # Next.js web dashboard (Phase 2)
└── PRD_DamKoi_v2.md         # Product Requirements Document
```

## 🚀 Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# Copy and fill in environment variables
cp .env.example .env

# Run the API
uvicorn app.main:app --reload --port 8000
```

### Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` folder
4. Open any Daraz product page → DamKoi widget appears

## 🆓 Free-Tier Stack

| Service | Purpose | Free Tier |
|---|---|---|
| Supabase | Database + Auth | 500MB, 50K MAU |
| Render | API hosting | 750 hrs/month |
| Vercel | Web hosting | 100GB bandwidth |
| Upstash | Redis cache | 10K cmds/day |
| Resend | Email alerts | 100 emails/day |
| Sentry | Error monitoring | 5K events/month |

**Total cost: $0/month** (+ $17 one-time for domain + Chrome Web Store)

## 📡 API Endpoints

```
GET  /v1/products/lookup?url={daraz_url}    # Product lookup + verdict
GET  /v1/products/{id}                       # Product details
GET  /v1/products/{id}/price-history         # Price history
GET  /v1/products/{id}/verdict               # Fake discount verdict
GET  /v1/products/{id}/alternatives          # Cheaper alternatives

POST /v1/alerts                              # Create price alert
GET  /v1/alerts?user_id={id}                 # Get user's alerts
PUT  /v1/alerts/{id}                         # Update alert
DELETE /v1/alerts/{id}                       # Delete alert

POST /v1/track                               # Track product (no auth)
GET  /v1/track?anon_id={id}                  # Get tracked products
```

## 📄 License

Private — All rights reserved.
