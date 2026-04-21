"""
DamKoi — Telegram Bot for Scraper Health Alerts

Sends alerts to a Telegram chat when scrapers fail or encounter issues.
Uses telegram.ext for polling mode (no webhook needed).
"""

import asyncio
import logging
from typing import Optional
from telegram import Bot
from telegram.error import TelegramError

from app.config import settings

logger = logging.getLogger(__name__)


class TelegramAlertService:
    """Send scraper health alerts via Telegram."""

    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = int(chat_id) if chat_id else None
        self.bot = Bot(token=token) if token else None
        self.is_configured = bool(token and chat_id)

    async def send_alert(self, title: str, message: str, severity: str = "info") -> bool:
        """
        Send an alert message to Telegram.

        Args:
            title: Alert title
            message: Alert message body
            severity: "info", "warning", or "error"

        Returns:
            True if sent successfully, False otherwise
        """
        if not self.is_configured:
            logger.warning("Telegram not configured (token or chat_id missing)")
            return False

        try:
            # Format severity emoji
            emoji_map = {"info": "ℹ️", "warning": "⚠️", "error": "🚨"}
            emoji = emoji_map.get(severity, "📢")

            formatted_message = f"""
{emoji} **DamKoi Scraper Alert**

**Title:** {title}
**Severity:** {severity.upper()}

**Message:**
{message}

_Timestamp: {asyncio.get_event_loop().time()}_
"""

            await self.bot.send_message(
                chat_id=self.chat_id,
                text=formatted_message,
                parse_mode="Markdown",
            )
            logger.info(f"Telegram alert sent: {title}")
            return True

        except TelegramError as e:
            logger.error(f"Failed to send Telegram alert: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending Telegram alert: {e}")
            return False

    async def send_scraper_failure(
        self, product_id: str, url: str, error: str, retry_count: int = 0
    ) -> bool:
        """Send alert when a scraper fails."""
        message = f"""
**Product:** {product_id}
**URL:** {url}
**Error:** {error}
**Retry Count:** {retry_count}/3
"""
        return await self.send_alert(
            title=f"Scraper Failed: {product_id[:12]}...",
            message=message,
            severity="error" if retry_count >= 3 else "warning",
        )

    async def send_scraper_success(
        self, batch_name: str, count: int, duration_seconds: float
    ) -> bool:
        """Send alert when scraper batch completes successfully."""
        message = f"""
**Batch:** {batch_name}
**Products Scraped:** {count}
**Duration:** {duration_seconds:.1f}s
**Status:** ✅ Complete
"""
        return await self.send_alert(
            title=f"Scraper Complete: {batch_name}",
            message=message,
            severity="info",
        )

    async def send_health_check(self, status: dict) -> bool:
        """Send periodic health check message."""
        message = f"""
**Hot Products Scraped:** {status.get('hot_count', 0)}
**Tracked Products Scraped:** {status.get('tracked_count', 0)}
**Alerts Checked:** {status.get('alerts_checked', 0)}
**Errors in Past Hour:** {status.get('errors', 0)}
**Uptime:** {status.get('uptime', 'N/A')}
"""
        return await self.send_alert(
            title="DamKoi Scraper Health Check",
            message=message,
            severity="info",
        )


# Global instance
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
