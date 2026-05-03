"""
DamKoi — Telegram Bot for Scraper Health Alerts

Sends alerts to a Telegram chat when scrapers fail or encounter issues.
Includes per-platform health reporting and a daily metrics digest.
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional
from telegram import Bot
from telegram.error import TelegramError
from telegram.constants import ParseMode

from app.config import settings

logger = logging.getLogger(__name__)

PLATFORM_EMOJI = {
    "daraz":    "🛒",
    "cartup":   "🛍️",
    "rokomari": "📚",
    "pickaboo": "📱",
    "chaldal":  "🥬",
    "othoba":   "🏪",
}


def _escape_md(text: str) -> str:
    """Escape special characters for Telegram MarkdownV2."""
    special = r"\_*[]()~`>#+-=|{}.!"
    return "".join(f"\\{c}" if c in special else c for c in str(text))


class TelegramAlertService:
    """Send scraper health alerts via Telegram."""

    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = int(chat_id) if chat_id else None
        self.bot = Bot(token=token) if token else None
        self.is_configured = bool(token and chat_id)

    async def _send(self, text: str, use_markdown: bool = True) -> bool:
        if not self.is_configured:
            logger.debug("Telegram not configured — skipping alert")
            return False
        try:
            await self.bot.send_message(
                chat_id=self.chat_id,
                text=text,
                parse_mode=ParseMode.MARKDOWN_V2 if use_markdown else None,
            )
            return True
        except TelegramError as e:
            logger.error("Telegram send failed: %s", e)
            return False
        except Exception as e:
            logger.error("Unexpected Telegram error: %s", e)
            return False

    async def send_alert(self, title: str, message: str, severity: str = "info") -> bool:
        """Send a generic alert to Telegram."""
        emoji_map = {"info": "ℹ️", "warning": "⚠️", "error": "🚨"}
        emoji = emoji_map.get(severity, "📢")
        ts = _escape_md(datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))

        text = (
            f"{emoji} *DamKoi Alert*\n\n"
            f"*{_escape_md(title)}*\n"
            f"_{_escape_md(message)}_\n\n"
            f"🕐 {ts}"
        )
        return await self._send(text)

    async def send_scraper_failure(
        self, product_id: str, url: str, error: str, retry_count: int = 0, platform: str = "daraz"
    ) -> bool:
        """Send alert when a scraper fails for a specific product."""
        p_emoji = PLATFORM_EMOJI.get(platform, "🌐")
        severity = "error" if retry_count >= 3 else "warning"
        emoji = "🚨" if severity == "error" else "⚠️"
        ts = _escape_md(datetime.utcnow().strftime("%H:%M UTC"))

        text = (
            f"{emoji} *Scraper Failure*\n\n"
            f"{p_emoji} Platform: `{_escape_md(platform)}`\n"
            f"🆔 Product: `{_escape_md(product_id[:16])}`\n"
            f"🔁 Retry: {retry_count}/3\n"
            f"❌ Error: _{_escape_md(error[:120])}_\n"
            f"🕐 {ts}"
        )
        return await self._send(text)

    async def send_scraper_success(
        self, batch_name: str, count: int, duration_seconds: float, platform: str = "daraz"
    ) -> bool:
        """Send alert when a scraper batch completes successfully."""
        p_emoji = PLATFORM_EMOJI.get(platform, "🌐")
        rate = _escape_md(f"{count / duration_seconds:.1f}/s") if duration_seconds > 0 else "—"
        dur = _escape_md(f"{duration_seconds:.1f}s")

        text = (
            f"✅ *Scraper Complete*\n\n"
            f"{p_emoji} `{_escape_md(batch_name)}`\n"
            f"📦 Scraped: *{count}* products\n"
            f"⏱ Duration: {dur} \\({rate}\\)\n"
            f"🕐 {_escape_md(datetime.utcnow().strftime('%H:%M UTC'))}"
        )
        return await self._send(text)

    async def send_platform_health(
        self, platform: str, scraped: int, failed: int, total: int, avg_duration_s: float,
    ) -> bool:
        """Per-platform health report sent after each scheduled batch."""
        p_emoji = PLATFORM_EMOJI.get(platform, "🌐")
        success_rate = int((scraped / total) * 100) if total > 0 else 0
        status_emoji = "✅" if success_rate >= 90 else "⚠️" if success_rate >= 70 else "🚨"
        avg = _escape_md(f"{avg_duration_s:.1f}s")
        ts = _escape_md(datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))

        text = (
            f"{status_emoji} *Platform Health: {_escape_md(platform.capitalize())}*\n\n"
            f"{p_emoji} *{_escape_md(platform.upper())}*\n"
            f"✅ Success: {scraped}/{total} \\({success_rate}%\\)\n"
            f"❌ Failed: {failed}\n"
            f"⚡ Avg: {avg}/product\n"
            f"🕐 {ts}"
        )
        return await self._send(text)

    async def send_daily_digest(self, stats: dict) -> bool:
        """
        Send daily metrics digest — called at 8AM BD time by scheduler.

        stats = {
            "total_products": int,
            "platforms": {"daraz": {"scraped": int, "failed": int}, ...},
            "alerts_sent": int,
            "deals_posted": int,
            "new_products": int,
            "uptime_pct": float,
        }
        """
        platform_lines = []
        for pname, pstats in stats.get("platforms", {}).items():
            p_emoji = PLATFORM_EMOJI.get(pname, "🌐")
            sc = pstats.get("scraped", 0)
            fa = pstats.get("failed", 0)
            rate = int((sc / (sc + fa)) * 100) if (sc + fa) > 0 else 0
            platform_lines.append(
                f"  {p_emoji} {_escape_md(pname.capitalize())}: {sc} ✅ / {fa} ❌ \\({rate}%\\)"
            )

        platforms_block = "\n".join(platform_lines) or "  _No data_"
        ts = _escape_md(datetime.utcnow().strftime("%Y-%m-%d"))
        total = _escape_md(str(stats.get("total_products", "—")))
        new_p = _escape_md(str(stats.get("new_products", 0)))
        alrt = _escape_md(str(stats.get("alerts_sent", 0)))
        deals = _escape_md(str(stats.get("deals_posted", 0)))
        uptime = _escape_md(str(stats.get("uptime_pct", 100)))

        coupon_att = _escape_md(str(stats.get("coupon_attempts", 0)))
        coupon_suc = _escape_md(str(stats.get("coupon_successes", 0)))
        coupon_sav = _escape_md(str(stats.get("coupon_savings_bdt", 0)))

        text = (
            f"📊 *DamKoi Daily Digest* — {ts}\n\n"
            f"*Scraper Health*\n{platforms_block}\n\n"
            f"📦 Total tracked: *{total}*\n"
            f"🆕 New today: *{new_p}*\n"
            f"🔔 Alerts sent: *{alrt}*\n"
            f"🔥 Deals posted: *{deals}*\n"
            f"🏥 Uptime: *{uptime}%*\n\n"
            f"*Coupon Auto\\-Apply*\n"
            f"🏷️ Attempts: *{coupon_att}* · Successes: *{coupon_suc}*\n"
            f"💰 Total saved: *৳{coupon_sav}*"
        )
        return await self._send(text)

    async def send_health_check(self, status: dict) -> bool:
        """Send periodic health check (legacy compatibility)."""
        message = (
            f"Hot scraped: {status.get('hot_count', 0)}\n"
            f"Tracked scraped: {status.get('tracked_count', 0)}\n"
            f"Alerts checked: {status.get('alerts_checked', 0)}\n"
            f"Errors/hr: {status.get('errors', 0)}"
        )
        return await self.send_alert(
            title="DamKoi Health Check",
            message=message,
            severity="info",
        )


# ── Singleton ─────────────────────────────────────────────────

_telegram_service: Optional[TelegramAlertService] = None


def get_telegram_service() -> TelegramAlertService:
    """Get or create Telegram service singleton."""
    global _telegram_service
    if _telegram_service is None:
        _telegram_service = TelegramAlertService(
            token=settings.TELEGRAM_BOT_TOKEN,
            chat_id=settings.TELEGRAM_CHAT_ID,
        )
    return _telegram_service
