# 🤖 Telegram Setup — Quick Start

Everything is ready! Just 4 steps:

## **Step 1: Create Bot via BotFather**

On your phone/Telegram desktop:
1. Open Telegram
2. Search: `@BotFather`
3. Send: `/newbot`
4. Answer the questions:
   - "What should your bot be called?" → `DamKoi Scraper Alerts`
   - "Give your bot a username?" → `damkoi_alerts_bot` (or any unique name)

5. **Copy the token** that looks like:
   ```
   1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg
   ```

---

## **Step 2: Create Chat Group**

1. In Telegram, create a new **Private Group** (not channel):
   - Tap "New Group" 
   - Add yourself only
   - Name: "DamKoi Alerts"

2. Copy the group link/ID

---

## **Step 3: Get Chat ID**

In Telegram app:
1. Send ANY message to your "DamKoi Alerts" group
2. Go to: `@getidsbot` 
3. Forward the message to @getidsbot
4. It will reply with your Chat ID (starts with `-100`)

**Example Chat ID:** `-1001234567890`

---

## **Step 4: Add to .env**

Edit `/backend/.env`:

```bash
# Find these lines:
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Replace with your values:
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg
TELEGRAM_CHAT_ID=-1001234567890
```

Save!

---

## **Step 5: Test It**

```bash
cd /Volumes/T7\ Shield/Xynly/Products/DamKoi/DamKoi\ Codebase/backend
source venv/bin/activate
python test_telegram.py
```

You should see in your Telegram group:
```
ℹ️ **DamKoi Telegram Test**
Title: DamKoi Telegram Test
Severity: INFO
Message: If you see this message, Telegram alerts are working! ✅
```

---

## **Done!** ✅

Now your scraper will send alerts to Telegram when:
- Scraper fails ❌
- Batch completes ✅
- Health check (periodic) 📊

---

**Questions?** Check `backend/TELEGRAM_SETUP.md` for detailed guide.
