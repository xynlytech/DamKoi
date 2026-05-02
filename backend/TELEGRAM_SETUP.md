# Telegram Bot Setup for DamKoi Scraper Alerts — Week 4

## What This Does
- Sends real-time alerts when scrapers fail
- Sends batch completion notifications
- Sends periodic health checks
- All messages go to a private Telegram chat

## Setup Instructions

### Step 1: Create Telegram Bot
1. Open Telegram app
2. Search for "@BotFather"
3. Start the chat and send: `/newbot`
4. Follow the prompts:
   - "What should your bot be called?" → `DamKoi Scraper Alerts`
   - "Give your bot a username" → `damkoi_alerts_bot` (or unique name)
5. BotFather will give you a **Token** that looks like:
   ```
   1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg
   ```
6. **Save this token** (you'll need it in step 3)

### Step 2: Get Your Chat ID
1. In Telegram, create a new **Private Group** (not channel):
   - Tap "New Group"
   - Add only yourself
   - Name: "DamKoi Alerts"
2. Open the group and find the group URL/ID by:
   - Sending a message to the bot: `/start`
   - Or use this helper: send `@userinfobot` a message, it will give your user ID
3. **For a private group**, forward any message to `@getidsbot` and it will tell you the group ID
4. **Save the Chat ID** (format: `-1001234567890`)

### Step 3: Add to Environment Variables
Edit `/backend/.env`:
```
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg
TELEGRAM_CHAT_ID=-1001234567890
```

### Step 4: Test the Setup
```bash
# Restart backend
cd /Volumes/T7\ Shield/Xynly/Products/DamKoi/DamKoi\ Codebase/backend
source venv/bin/activate
pkill -f uvicorn
uvicorn app.main:app --reload --port 8000 &
```

Then test the Telegram service:
```bash
python -c "
import asyncio
from app.services.telegram import get_telegram_service

async def test():
    svc = get_telegram_service()
    result = await svc.send_alert(
        title='Test Alert',
        message='If you see this in Telegram, setup worked!',
        severity='info'
    )
    print(f'Alert sent: {result}')

asyncio.run(test())
"
```

You should receive a message in your Telegram group within seconds.

## Integration Points

The Telegram service is ready to be integrated into:

1. **Scraper Failures** (in `app/scraper/tasks.py`):
```python
from app.services.telegram import get_telegram_service

async def scrape_hot_products():
    try:
        # ... scraping code ...
    except Exception as e:
        telegram = get_telegram_service()
        await telegram.send_scraper_failure(
            product_id=product.id,
            url=product.url,
            error=str(e),
            retry_count=retry_attempt
        )
```

2. **Batch Completion** (in `app/scraper/tasks.py`):
```python
telegram = get_telegram_service()
await telegram.send_scraper_success(
    batch_name="hot_products",
    count=len(scraped),
    duration_seconds=elapsed_time
)
```

3. **Health Checks** (in `app/scraper/tasks.py`):
```python
telegram = get_telegram_service()
await telegram.send_health_check({
    'hot_count': 150,
    'tracked_count': 320,
    'alerts_checked': 45,
    'errors': 2,
    'uptime': '24h 15m'
})
```

## Alert Types

The service provides ready-made alert methods:

- `send_alert(title, message, severity)` — Generic alert
- `send_scraper_failure(product_id, url, error, retry_count)` — When scraper fails
- `send_scraper_success(batch_name, count, duration)` — When batch completes
- `send_health_check(status)` — Periodic health reports

## Troubleshooting

### "Chat not found"
- Make sure the Chat ID is correct (starts with `-100`)
- Make sure the bot is a member of the group

### "Unauthorized"
- Token might be expired or incorrect
- Regenerate token in BotFather by sending `/revoke`

### No messages received
- Check Telegram group permissions
- Verify bot is added to the group
- Check `.env` variables are properly loaded

## Free Tier
- ✅ Unlimited messages
- ✅ No rate limits
- ✅ No cost

---

**Status:** ⏳ PENDING Token & Chat ID setup
**Time to complete:** 10 minutes
**Next:** Integrate alerts into scraper tasks
