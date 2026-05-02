# Sentry Error Monitoring Setup — DamKoi Week 4

## Current Status ✅
- Sentry SDK is already installed (`sentry-sdk[fastapi]==2.19.2`)
- Integration is configured in `app/main.py` (lines 24-29)
- Just needs DSN to be active

## Setup Instructions

### Step 1: Create Sentry Account (if you don't have one)
1. Go to https://sentry.io/
2. Sign up for free account
3. You get 5,000 error events/month on free tier

### Step 2: Create a New Project
1. In Sentry dashboard, click "Projects"
2. Click "Create Project"
3. Select platform: **Python**
4. Select framework: **FastAPI**
5. Set project name: "DamKoi Backend"
6. Click "Create Project"

### Step 3: Get Your DSN
1. After project creation, you'll be shown your DSN
2. It looks like: `https://xxxxx@sentry.io/12345`
3. Copy it

### Step 4: Add to Environment Variables
Edit `/backend/.env`:
```
SENTRY_DSN=https://xxxxx@sentry.io/12345
```

### Step 5: Restart Backend
```bash
# Kill the running process
pkill -f "uvicorn app.main"

# Restart
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Step 6: Test the Integration
Once running, trigger an error to test:
```bash
# Call an endpoint that will cause an error
curl -X POST http://localhost:8000/v1/alerts \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

You should see the error appear in your Sentry dashboard within a few seconds.

## What Gets Monitored
With Sentry enabled, the following are automatically tracked:
- ✅ Unhandled exceptions
- ✅ API response times (traces)
- ✅ Database errors
- ✅ Scraper failures
- ✅ Alert sending failures
- ✅ Custom error messages

## Configuration Details (Already Set)
```python
# From app/main.py
sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    traces_sample_rate=0.1,  # 10% of transactions in prod, 100% in dev
    environment=settings.APP_ENV,  # "development" or "production"
)
```

## Free Tier Limits
- 5,000 error events/month
- 50,000 transactions/month
- 14-day retention
- Enough for MVP/beta phase

## Dashboard Features
Once set up, you can:
- View real-time errors as they happen
- Set up email alerts for critical errors
- Track error trends over time
- See which endpoints are failing
- Get stack traces for debugging
- View session replays (premium)

---

**Status:** ⏳ PENDING DSN setup
**Time to complete:** 5 minutes
**Owner:** Product/DevOps team
