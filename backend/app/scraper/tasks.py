"""
DamKoi — Scraper Task Scheduler

Uses APScheduler (in-process) instead of Celery + Redis to stay within
free tier limits. Manages all scraping schedules from PRD Section 9.

Schedule:
- Hot products (>10 alerts): every hour
- Tracked products (≥1 user): every 6 hours
- Long-tail: daily at 2am BD time
- Alert checks: every 15 minutes
"""

import asyncio
from datetime import datetime
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.product import Product
from app.models.price_snapshot import PriceSnapshot
from app.models.alert import Alert
from app.models.alert_event import AlertEvent
from app.scraper.daraz_scraper import DarazScraper


# ── Scheduler Instance ────────────────────────────────────────

scheduler = AsyncIOScheduler(timezone="Asia/Dhaka")


def setup_scheduler():
    """Configure and start the scrape scheduler."""

    # Hot products: every hour (products with >10 active alerts or high view count)
    scheduler.add_job(
        scrape_hot_products,
        trigger=CronTrigger(minute=0),  # top of every hour
        id="scrape_hot_products",
        name="Scrape Hot Products (Hourly)",
        replace_existing=True,
    )

    # Tracked products: every 6 hours
    scheduler.add_job(
        scrape_tracked_products,
        trigger=CronTrigger(hour="*/6"),
        id="scrape_tracked_products",
        name="Scrape Tracked Products (6h)",
        replace_existing=True,
    )

    # Long-tail: daily at 2am BD time
    scheduler.add_job(
        scrape_longtail_products,
        trigger=CronTrigger(hour=2, minute=0),
        id="scrape_longtail_products",
        name="Scrape Long-Tail Products (Daily 2AM)",
        replace_existing=True,
    )

    # Alert checks: every 15 minutes
    scheduler.add_job(
        check_all_alerts,
        trigger=IntervalTrigger(minutes=15),
        id="check_alerts",
        name="Check Price Alerts (15min)",
        replace_existing=True,
    )

    scheduler.start()
    print("⏰ Scheduler started with all jobs.")


# ── Scrape Tasks ──────────────────────────────────────────────


async def scrape_hot_products():
    """Scrape products with >10 active alerts (high priority)."""
    print(f"🔥 [{datetime.now()}] Starting hot product scrape...")

    async with async_session_factory() as db:
        # Find products with the most active alerts
        result = await db.execute(
            select(Product.id, Product.url)
            .join(Alert, and_(Alert.product_id == Product.id, Alert.is_active == True))
            .group_by(Product.id, Product.url)
            .having(func.count(Alert.id) >= 10)
        )
        hot_products = result.all()

    if not hot_products:
        print("   No hot products to scrape.")
        return

    urls = [p.url for p in hot_products]
    await _run_scrape_batch(urls, "hot")


async def scrape_tracked_products():
    """Scrape products tracked by at least 1 user."""
    print(f"👁️ [{datetime.now()}] Starting tracked product scrape...")

    async with async_session_factory() as db:
        from app.models.tracked_product import TrackedProduct

        result = await db.execute(
            select(Product.id, Product.url)
            .join(TrackedProduct, TrackedProduct.product_id == Product.id)
            .where(Product.is_active == True)
            .group_by(Product.id, Product.url)
        )
        tracked = result.all()

    if not tracked:
        print("   No tracked products to scrape.")
        return

    urls = [p.url for p in tracked]
    await _run_scrape_batch(urls, "tracked")


async def scrape_longtail_products():
    """Scrape all other active products (daily at 2AM)."""
    print(f"🌙 [{datetime.now()}] Starting long-tail product scrape...")

    async with async_session_factory() as db:
        result = await db.execute(
            select(Product.id, Product.url)
            .where(Product.is_active == True)
            .order_by(Product.last_scraped_at.asc().nullsfirst())
            .limit(1000)  # batch limit to avoid timeout
        )
        products = result.all()

    if not products:
        print("   No products to scrape.")
        return

    urls = [p.url for p in products]
    await _run_scrape_batch(urls, "longtail")


async def check_all_alerts():
    """Check all active alerts and send notifications for triggered ones."""
    print(f"🔔 [{datetime.now()}] Checking price alerts...")

    async with async_session_factory() as db:
        # Get all active alerts with current prices
        result = await db.execute(
            select(Alert, Product)
            .join(Product, Alert.product_id == Product.id)
            .where(Alert.is_active == True)
        )
        alerts = result.all()

        triggered_count = 0

        for alert, product in alerts:
            # Get latest price
            price_result = await db.execute(
                select(PriceSnapshot.price)
                .where(PriceSnapshot.product_id == product.id)
                .order_by(PriceSnapshot.scraped_at.desc())
                .limit(1)
            )
            latest_price = price_result.scalar_one_or_none()

            if latest_price is None:
                continue

            # Check if price is at or below target
            if latest_price <= alert.target_price:
                # Check 24h rate limit
                if alert.last_triggered:
                    hours_since = (datetime.utcnow() - alert.last_triggered).total_seconds() / 3600
                    if hours_since < 24:
                        continue

                # Trigger alert!
                await _send_alert_notification(alert, product, latest_price, db)
                triggered_count += 1

        if triggered_count > 0:
            await db.commit()

    print(f"   ✅ Checked {len(alerts)} alerts; {triggered_count} triggered.")


# ── Helper Functions ──────────────────────────────────────────


async def _run_scrape_batch(urls: list, batch_type: str):
    """Run a batch scrape and save results to the database."""
    async with DarazScraper(headless=True) as scraper:
        products = await scraper.scrape_batch(urls)

    if not products:
        print(f"   ⚠️ No products scraped in {batch_type} batch.")
        return

    # Save to database
    async with async_session_factory() as db:
        for scraped in products:
            # Upsert product
            result = await db.execute(
                select(Product).where(
                    and_(
                        Product.platform == "daraz",
                        Product.external_id == scraped.external_id,
                    )
                )
            )
            product = result.scalar_one_or_none()

            if not product:
                from app.scraper.daraz_scraper import _normalize_title
                product = Product(
                    platform="daraz",
                    external_id=scraped.external_id,
                    url=scraped.url,
                    title=scraped.title,
                    normalized_title=_normalize_title(scraped.title),
                    category=scraped.category,
                    brand=scraped.brand,
                    model_number=scraped.model_number,
                    image_url=scraped.image_url,
                )
                db.add(product)
                await db.flush()

            # Update last scraped timestamp
            product.last_scraped_at = datetime.utcnow()

            # Add price snapshot (append-only)
            snapshot = PriceSnapshot(
                product_id=product.id,
                price=scraped.price,
                original_price=scraped.original_price,
                discount_pct=scraped.discount_pct,
                in_stock=scraped.in_stock,
            )
            db.add(snapshot)

        await db.commit()

    print(f"   ✅ Saved {len(products)} products from {batch_type} batch.")


async def _send_alert_notification(
    alert: Alert,
    product: Product,
    current_price: int,
    db: AsyncSession,
):
    """Send alert notification and log the event."""
    from app.services.mailer import mailer
    
    # Check if we have an email to send to
    to_email = alert.user.email if alert.user and alert.user.email else None
    if not to_email:
        print(f"   ⚠️ No email found for alert {alert.id}. Skipping.")
        return

    # Log the event
    event = AlertEvent(
        alert_id=alert.id,
        price_at_trigger=current_price,
        channel="email",
        success=False,  # default to False until sent
    )
    db.add(event)

    # Update alert
    alert.last_triggered = datetime.utcnow()

    # Send email via Mailer Service
    success = mailer.send_price_drop_email(
        to_email=to_email,
        product_title=product.title,
        product_url=product.url,
        current_price=current_price / 100.0,
        target_price=alert.target_price / 100.0,
        image_url=product.image_url
    )
    
    if success:
        event.success = True
        print(f"   📧 Alert email sent to {to_email} for {product.title[:40]}...")
    else:
        print(f"   ❌ Alert email failed for {to_email}")
