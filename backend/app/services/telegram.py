"""
DamKoi — Telegram Bot Service

Two distinct roles:
  1. Admin alerts -- sent to TELEGRAM_CHAT_ID (group/channel).
     Covers: scraper failures, daily digest, platform health.
  2. User price-drop DMs -- sent to individual user.telegram_chat_id.
     Triggered by check_all_alerts() in tasks.py when 'telegram' is
     in alert.notify_via and the user has linked their account.
"""

import logging
from datetime import datetime
from typing import Optional
from telegram import Bot
from telegram.error import TelegramError
from telegram.constants import ParseMode

from app.config import settings

logger = logging.getLogger(__name__)

PLATFORM_LABEL = {
    "daraz":    "Daraz",
    "cartup":   "Cartup",
    "rokomari": "Rokomari",
    "pickaboo": "Pickaboo",
    "chaldal":  "Chaldal",
    "othoba":   "Othoba",
}


def _escape_md(text: str) -> str:
    """Escape special characters for Telegram MarkdownV2."""
    special = r"\_*[]()~`>#+-=|{}.!"
    return "".join(f"\\{c}" if c in special else c for c in str(text))


class TelegramAlertService:
    """Send scraper health alerts (admin) and user price-drop DMs via Telegram."""

    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = int(chat_id) if chat_id else None
        self.bot = Bot(token=token) if token else None
        self.is_configured = bool(token and chat_id)

    # -- Internal send helpers -----------------------------------------

    async def _send(self, text: str, use_markdown: bool = True) -> bool:
        """Send to the admin group/channel (TELEGRAM_CHAT_ID)."""
        if not self.is_configured:
            logger.debug("Telegram not configured -- skipping alert")
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

    async def _send_to(self, chat_id: int, text: str, use_markdown: bool = True) -> bool:
        """Send to an arbitrary chat_id (used for user DMs)."""
        if not self.bot:
            logger.debug("Telegram bot not initialised -- skipping user DM")
            return False
        try:
            await self.bot.send_message(
                chat_id=chat_id,
                text=text,
                parse_mode=ParseMode.MARKDOWN_V2 if use_markdown else None,
            )
            return True
        except TelegramError as e:
            logger.error("Telegram user DM failed (chat_id=%s): %s", chat_id, e)
            return False
        except Exception as e:
            logger.error("Unexpected Telegram DM error (chat_id=%s): %s", chat_id, e)
            return False

    # -- User-facing price-drop DMs ------------------------------------

    async def send_price_drop_alert(
        self,
        user_chat_id: str,
        product_title: str,
        product_url: str,
        platform: str,
        current_price: float,
        target_price: float,
        image_url: Optional[str] = None,
    ) -> bool:
        """
        Send a personal Telegram DM to a user when their alert triggers.

        Args:
            user_chat_id: The user's personal Telegram chat ID (stored on User model).
            product_title: Product name.
            product_url: Direct link to the product page on DamKoi or the platform.
            platform: Platform slug (daraz, rokomari, ...).
            current_price: Current price in BDT (float, already divided by 100).
            target_price: User's target price in BDT (float, already divided by 100).
            image_url: Currently unused.
        """
        try:
            cid = int(user_chat_id)
        except (ValueError, TypeError):
            logger.warning("Invalid user telegram_chat_id: %r -- skipping DM", user_chat_id)
            return False

        platform_label = PLATFORM_LABEL.get(platform, platform.capitalize())
        drop_pct = (
            int(((target_price - current_price) / target_price) * 100)
            if target_price > 0
            else 0
        )
        ts = _escape_md(datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))

        title_esc    = _escape_md(product_title[:60])
        url_esc      = _escape_md(product_url)
        cur_esc      = _escape_md(f"BDT {current_price:,.2f}")
        tgt_esc      = _escape_md(f"BDT {target_price:,.2f}")
        drop_esc     = _escape_md(f"{drop_pct}%")
        platform_esc = _escape_md(platform_label)

        text = (
            f"\\[PRICE DROP\\] *{title_esc}*\n\n"
            f"Platform:      {platform_esc}\n"
            f"Current price: *{cur_esc}*\n"
            f"Your target:   {tgt_esc}\n"
            f"Below target:  *{drop_esc}*\n\n"
            f"[View on DamKoi]({url_esc})\n\n"
            f"_{ts}_\n"
            f"_Reply /unsubscribe to stop Telegram alerts\\._"
        )
        return await self._send_to(cid, text)

    async def send_telegram_link_confirmation(self, user_chat_id: str, email: str) -> bool:
        """
        Send a welcome DM confirming the Telegram link was successful.
        Called immediately after the user POSTs to /alerts/telegram/link.
        """
        try:
            cid = int(user_chat_id)
        except (ValueError, TypeError):
            return False

        email_esc = _escape_md(email or "your account")
        text = (
            f"\\[DamKoi\\] Telegram notifications activated\n\n"
            f"Account: *{email_esc}*\n\n"
            f"You will receive a direct message here whenever one of your price "
            f"alerts triggers\\.\n\n"
            f"_To unlink, visit your dashboard or send /unsubscribe\\._"
        )
        return await self._send_to(cid, text)

    # -- Admin / ops alerts --------------------------------------------

    async def send_alert(self, title: str, message: str, severity: str = "info") -> bool:
        """Send a generic alert to the admin Telegram group."""
        severity_label = {"info": "[INFO]", "warning": "[WARN]", "error": "[ERROR]"}.get(
            severity, "[NOTICE]"
        )
        ts = _escape_md(datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))

        text = (
            f"{_escape_md(severity_label)} *DamKoi Alert*\n\n"
            f"*{_escape_md(title)}*\n"
            f"_{_escape_md(message)}_\n\n"
            f"{ts}"
        )
        return await self._send(text)

    async def send_scraper_failure(
        self, product_id: str, url: str, error: str, retry_count: int = 0, platform: str = "daraz"
    ) -> bool:
        """Send alert when a scraper fails for a specific product."""
        severity_label = "\\[ERROR\\]" if retry_count >= 3 else "\\[WARN\\]"
        platform_label = _escape_md(PLATFORM_LABEL.get(platform, platform.capitalize()))
        ts = _escape_md(datetime.utcnow().strftime("%H:%M UTC"))

        text = (
            f"{severity_label} *Scraper Failure*\n\n"
            f"Platform: `{platform_label}`\n"
            f"Product:  `{_escape_md(product_id[:16])}`\n"
            f"Retry:    {retry_count}/3\n"
            f"Error:    _{_escape_md(error[:120])}_\n"
            f"{ts}"
        )
        return await self._send(text)

    async def send_scraper_success(
        self, batch_name: str, count: int, duration_seconds: float, platform: str = "daraz"
    ) -> bool:
        """Send alert when a scraper batch completes successfully."""
        rate = _escape_md(f"{count / duration_seconds:.1f}/s") if duration_seconds > 0 else "n/a"
        dur  = _escape_md(f"{duration_seconds:.1f}s")

        text = (
            f"\\[OK\\] *Scraper Complete*\n\n"
            f"Batch:    `{_escape_md(batch_name)}`\n"
            f"Scraped:  *{count}* products\n"
            f"Duration: {dur} \\({rate}\\)\n"
            f"{_escape_md(datetime.utcnow().strftime('%H:%M UTC'))}"
        )
        return await self._send(text)

    async def send_platform_health(
        self, platform: str, scraped: int, failed: int, total: int, avg_duration_s: float,
    ) -> bool:
        """Per-platform health report sent after each scheduled batch."""
        platform_label = _escape_md(PLATFORM_LABEL.get(platform, platform.capitalize()))
        success_rate = int((scraped / total) * 100) if total > 0 else 0
        status_label = (
            "\\[OK\\]"   if success_rate >= 90
            else "\\[WARN\\]"  if success_rate >= 70
            else "\\[ERROR\\]"
        )
        avg = _escape_md(f"{avg_duration_s:.1f}s")
        ts  = _escape_md(datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))

        text = (
            f"{status_label} *Platform Health: {platform_label}*\n\n"
            f"Success: {scraped}/{total} \\({success_rate}%\\)\n"
            f"Failed:  {failed}\n"
            f"Avg:     {avg}/product\n"
            f"{ts}"
        )
        return await self._send(text)

    async def send_daily_digest(self, stats: dict) -> bool:
        """
        Send daily metrics digest -- called at 8AM BD time by scheduler.

        Expected stats keys:
            total_products, new_products, alerts_sent, telegram_alerts_sent,
            deals_posted, uptime_pct, coupon_attempts, coupon_successes,
            coupon_savings_bdt, platforms: {name: {scraped, failed}}
        """
        platform_lines = []
        for pname, pstats in stats.get("platforms", {}).items():
            label = PLATFORM_LABEL.get(pname, pname.capitalize())
            sc    = pstats.get("scraped", 0)
            fa    = pstats.get("failed", 0)
            rate  = int((sc / (sc + fa)) * 100) if (sc + fa) > 0 else 0
            platform_lines.append(
                f"  {_escape_md(label)}: {sc} ok / {fa} fail \\({rate}%\\)"
            )

        platforms_block = "\n".join(platform_lines) or "  No data"
        ts         = _escape_md(datetime.utcnow().strftime("%Y-%m-%d"))
        total      = _escape_md(str(stats.get("total_products", "n/a")))
        new_p      = _escape_md(str(stats.get("new_products", 0)))
        alrt       = _escape_md(str(stats.get("alerts_sent", 0)))
        tg_alrt    = _escape_md(str(stats.get("telegram_alerts_sent", 0)))
        deals      = _escape_md(str(stats.get("deals_posted", 0)))
        uptime     = _escape_md(str(stats.get("uptime_pct", 100)))
        coupon_att = _escape_md(str(stats.get("coupon_attempts", 0)))
        coupon_suc = _escape_md(str(stats.get("coupon_successes", 0)))
        coupon_sav = _escape_md(str(stats.get("coupon_savings_bdt", 0)))

        text = (
            f"*DamKoi Daily Digest* \\| {ts}\n\n"
            f"*Scraper Health*\n{platforms_block}\n\n"
            f"Total tracked:         *{total}*\n"
            f"New today:             *{new_p}*\n"
            f"Alerts \\(email\\):      *{alrt}*\n"
            f"Alerts \\(Telegram\\):   *{tg_alrt}*\n"
            f"Deals posted:          *{deals}*\n"
            f"Uptime:                *{uptime}%*\n\n"
            f"*Coupon Auto\\-Apply*\n"
            f"Attempts:  *{coupon_att}* / Successes: *{coupon_suc}*\n"
            f"Savings:   *BDT {coupon_sav}*"
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


# -- Singleton ---------------------------------------------------------

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
