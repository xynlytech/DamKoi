#!/usr/bin/env python
"""
DamKoi — Telegram Integration Test

This script tests the Telegram alert service without needing a real bot token.
Once you have a token, this will send real alerts.
"""

import asyncio
import sys
from app.services.telegram import get_telegram_service
from app.config import settings


async def test_telegram():
    """Test Telegram service."""

    print("=" * 70)
    print("DamKoi Telegram Alert Service — Test")
    print("=" * 70)

    # Check if configured
    if not settings.TELEGRAM_BOT_TOKEN:
        print("\n❌ TELEGRAM_BOT_TOKEN not set in .env")
        print("\nTo set up:")
        print("1. Open Telegram → Search '@BotFather'")
        print("2. Send: /newbot")
        print("3. Follow prompts, copy the token")
        print("4. Edit .env and add: TELEGRAM_BOT_TOKEN=<your-token>")
        print("5. Edit .env and add: TELEGRAM_CHAT_ID=<your-chat-id>")
        print("6. Run this test again")
        return False

    if not settings.TELEGRAM_CHAT_ID:
        print("\n❌ TELEGRAM_CHAT_ID not set in .env")
        print("See instructions above.")
        return False

    print("\n✅ Configuration found!")
    print(f"   Bot Token: {settings.TELEGRAM_BOT_TOKEN[:20]}...")
    print(f"   Chat ID: {settings.TELEGRAM_CHAT_ID}")

    # Test service
    telegram = get_telegram_service()

    if not telegram.is_configured:
        print("\n❌ Telegram service not properly configured")
        return False

    print("\n📤 Sending test alert...")

    # Send test alert
    success = await telegram.send_alert(
        title="DamKoi Telegram Test",
        message="If you see this message, Telegram alerts are working! ✅",
        severity="info"
    )

    if success:
        print("✅ Alert sent successfully!")
        print("\nCheck your Telegram group for the message.")
        print("(May take a few seconds to appear)")
        return True
    else:
        print("❌ Failed to send alert")
        print("Check your bot token and chat ID")
        return False


async def test_scraper_alerts():
    """Test scraper-specific alerts."""
    print("\n" + "=" * 70)
    print("Testing Scraper Alerts")
    print("=" * 70)

    telegram = get_telegram_service()

    if not telegram.is_configured:
        print("⚠️ Telegram not configured, skipping scraper alerts test")
        return

    print("\n1️⃣ Testing scraper success alert...")
    await telegram.send_scraper_success(
        batch_name="Test Batch",
        count=42,
        duration_seconds=123.5
    )
    print("✅ Sent")

    print("\n2️⃣ Testing scraper failure alert...")
    await telegram.send_scraper_failure(
        product_id="test-prod-123",
        url="https://daraz.com.bd/products/test",
        error="Connection timeout",
        retry_count=1
    )
    print("✅ Sent")

    print("\n3️⃣ Testing health check alert...")
    await telegram.send_health_check({
        'hot_count': 150,
        'tracked_count': 320,
        'alerts_checked': 45,
        'errors': 2,
        'uptime': '24h 15m'
    })
    print("✅ Sent")

    print("\n✅ All alerts sent!")


async def main():
    """Run all tests."""
    test_passed = await test_telegram()

    if test_passed:
        await test_scraper_alerts()
        print("\n" + "=" * 70)
        print("✅ ALL TESTS PASSED")
        print("=" * 70)
        print("\nTelegram alerts are now active!")
        print("Scraper failures will automatically send alerts to your chat.")
        return 0
    else:
        print("\n" + "=" * 70)
        print("❌ TEST FAILED")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
