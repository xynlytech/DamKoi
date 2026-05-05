#!/usr/bin/env python3
"""
DamKoi -- Telegram Deals Bot

Posts top deals to a Telegram channel every 6 hours.
Deduplicates using a local JSON file so the same product
isn't posted twice within a 48-hour window.

Usage:
  python3 telegram_deals_bot.py           # Run once and exit
  python3 telegram_deals_bot.py --dry-run # Print messages without sending

Environment variables required:
  TELEGRAM_BOT_TOKEN   - Bot token from @BotFather
  TELEGRAM_CHANNEL_ID  - Channel username or chat ID (e.g. @damkoi_deals or -100123456)

Optional:
  DAMKOI_API_BASE      - Default: http://localhost:8000
  SENT_DEALS_FILE      - Default: sent_deals.json
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List

import httpx

# Load .env from the backend directory so the bot works standalone
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_file)
    except ImportError:
        # Manual fallback if python-dotenv not installed
        for line in _env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

# -- Config ------------------------------------------------------------

BOT_TOKEN   = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHANNEL_ID  = os.environ.get("TELEGRAM_CHAT_ID", "")   # matches .env key
API_BASE    = os.environ.get("DAMKOI_API_BASE", os.environ.get("API_BASE_URL", "http://localhost:8000"))
SENT_FILE   = Path(os.environ.get("SENT_DEALS_FILE", str(Path(__file__).parent / "sent_deals.json")))

DEDUP_WINDOW_HOURS = 48   # Don't re-post same product within this window
MIN_SCORE          = 8    # Only post deals with deal_score >= this
MAX_POSTS_PER_RUN  = 5    # Max deals posted per run

DASHBOARD_BASE = os.environ.get("DAMKOI_DASHBOARD_BASE", "https://damkoi.com")


# -- Dedup helpers -----------------------------------------------------

def load_sent() -> dict:
    if SENT_FILE.exists():
        try:
            return json.loads(SENT_FILE.read_text())
        except Exception:
            return {}
    return {}


def save_sent(sent: dict) -> None:
    SENT_FILE.write_text(json.dumps(sent, indent=2))


def prune_sent(sent: dict) -> dict:
    """Remove entries older than DEDUP_WINDOW_HOURS."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=DEDUP_WINDOW_HOURS)).isoformat()
    return {k: v for k, v in sent.items() if v > cutoff}


def was_sent(sent: dict, product_id: str) -> bool:
    return product_id in sent


def mark_sent(sent: dict, product_id: str) -> None:
    sent[product_id] = datetime.now(timezone.utc).isoformat()


# -- Formatting --------------------------------------------------------

VERDICT_LABEL = {
    "BEST_PRICE":        "BEST PRICE",
    "GOOD_DEAL":         "GOOD DEAL",
    "FAIR_PRICE":        "FAIR PRICE",
    "FAKE_DISCOUNT":     "FAKE DISCOUNT",
    "INSUFFICIENT_DATA": "TRACKING",
}

SCORE_BAR_FILLED  = "|"
SCORE_BAR_EMPTY   = "."


def format_bdt(paisa: Optional[int]) -> str:
    if not paisa:
        return "N/A"
    return f"BDT {paisa / 100:,.0f}"


def _build_score_bar(score: int) -> str:
    """Compact ASCII score bar: e.g. score 7 -> '|||||||...' (10 chars)"""
    filled = min(score, 10)
    return SCORE_BAR_FILLED * filled + SCORE_BAR_EMPTY * (10 - filled)


def format_deal_message(deal: dict) -> str:
    product     = deal["product"]
    score       = deal["deal_score"]
    label       = deal["label"]
    explanation = deal["explanation"]
    avg_30d: Optional[int] = deal.get("avg_30d")

    verdict_text = VERDICT_LABEL.get(label, label)
    score_bar    = _build_score_bar(score)

    current_fmt = format_bdt(product.get("current_price"))
    avg_fmt     = format_bdt(avg_30d) if avg_30d else ""

    savings_line = ""
    if avg_30d and product.get("current_price"):
        savings = avg_30d - product["current_price"]
        if savings > 0:
            pct = round(savings / avg_30d * 100)
            savings_line = f"\nSave {format_bdt(savings)} ({pct}% below 30-day avg)"

    title = product["title"][:80] + ("..." if len(product["title"]) > 80 else "")
    product_url = f"{DASHBOARD_BASE}/product/{product['id']}"
    daraz_url   = product.get("url", "")

    msg = (
        f"[{verdict_text}] *{title}*\n\n"
        f"*{current_fmt}*"
        f"{' -- was ' + avg_fmt if avg_fmt else ''}"
        f"{savings_line}\n\n"
        f"Deal Score: {score}/10\n"
        f"{score_bar}\n\n"
        f"_{explanation}_\n\n"
        f"[Full Price History]({product_url})\n"
        f"[View on Daraz]({daraz_url})"
    )
    return msg


# -- Telegram API ------------------------------------------------------

async def send_telegram_message(client: httpx.AsyncClient, text: str, dry_run: bool) -> bool:
    if dry_run:
        print("\n" + "-" * 60)
        print(text)
        return True

    if not BOT_TOKEN or not CHANNEL_ID:
        print("[ERROR] TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set.", file=sys.stderr)
        return False

    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    try:
        resp = await client.post(url, json={
            "chat_id":    CHANNEL_ID,
            "text":       text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": False,
        }, timeout=10.0)
        resp.raise_for_status()
        return True
    except Exception as e:
        print(f"[ERROR] Telegram send failed: {e}", file=sys.stderr)
        return False


# -- Main --------------------------------------------------------------

async def run(dry_run: bool = False) -> None:
    mode = "DRY RUN" if dry_run else "LIVE"
    print(f"[START] DamKoi Deals Bot -- {mode} -- {datetime.now()}")

    # Load dedup state
    sent = load_sent()
    sent = prune_sent(sent)

    async with httpx.AsyncClient() as client:
        # Fetch deals
        try:
            resp = await client.get(
                f"{API_BASE}/v1/products/deals",
                params={"min_score": MIN_SCORE, "limit": 20},
                timeout=15.0,
            )
            resp.raise_for_status()
            all_deals: List[dict] = resp.json()
        except Exception as e:
            print(f"[ERROR] Failed to fetch deals: {e}", file=sys.stderr)
            return

        print(f"[INFO] Got {len(all_deals)} deals from API")

        # Filter already-sent
        new_deals = [
            d for d in all_deals
            if not was_sent(sent, d["product"]["id"])
        ][:MAX_POSTS_PER_RUN]

        if not new_deals:
            print("[INFO] No new deals to post (all already sent within dedup window).")
            return

        print(f"[INFO] Posting {len(new_deals)} new deals...")

        for deal in new_deals:
            msg = format_deal_message(deal)
            ok  = await send_telegram_message(client, msg, dry_run=dry_run)
            if ok:
                mark_sent(sent, deal["product"]["id"])
                print(f"  [OK] Posted: {deal['product']['title'][:60]}")
            await asyncio.sleep(1.5)  # Telegram rate limit

    # Persist dedup state
    if not dry_run:
        save_sent(sent)

    print(f"\n[DONE] Posted {len(new_deals)} deals.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DamKoi Telegram Deals Bot")
    parser.add_argument("--dry-run", action="store_true", help="Print messages without sending to Telegram")
    args = parser.parse_args()
    asyncio.run(run(dry_run=args.dry_run))
