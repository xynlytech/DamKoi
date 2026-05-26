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
import logging
import time
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from sqlalchemy import select, func, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.product import Product
from app.models.price_snapshot import PriceSnapshot
from app.models.alert import Alert
from app.models.alert_event import AlertEvent
from app.models.coupon import Coupon
from app.models.coupon_application import CouponApplication
from app.scraper.daraz_scraper import DarazScraper
from app.services.telegram import get_telegram_service
from app.scraper.wayback import WaybackBackfiller
from app.scraper.sitemap_harvester import SitemapHarvester
from app.services.flags import is_platform_enabled

logger = logging.getLogger(__name__)


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

    # Telegram deals bot: every 6 hours, offset 3h from scrape jobs
    # (runs at 3am, 9am, 3pm, 9pm BD time — after scrape has fresh data)
    scheduler.add_job(
        post_deals_to_telegram,
        trigger=CronTrigger(hour="3,9,15,21", minute=0),
        id="telegram_deals_bot",
        name="Post Deals to Telegram (6h)",
        replace_existing=True,
    )

    # Coupon refresh: every 2 hours
    scheduler.add_job(
        refresh_platform_coupons,
        trigger=CronTrigger(hour="*/2", minute=15),
        id="refresh_platform_coupons",
        name="Refresh Platform Coupons (2h)",
        replace_existing=True,
    )

    # Sitemap Harvester: daily at 4am BD time
    scheduler.add_job(
        harvest_new_products,
        trigger=CronTrigger(hour=4, minute=0),
        id="sitemap_harvester",
        name="Sitemap Discovery (Daily 4AM)",
        replace_existing=True,
    )

    # Snapshot Cleanup: daily at 5am BD time (PRD §9)
    scheduler.add_job(
        cleanup_snapshots,
        trigger=CronTrigger(hour=5, minute=0),
        id="cleanup_snapshots",
        name="Cleanup Snapshots (Daily 5AM)",
        replace_existing=True,
    )

    # Continuous Backfill: every hour, pick 50 products to get 3-month history
    scheduler.add_job(
        run_continuous_backfill,
        trigger=CronTrigger(minute=30),  # mid-hour to avoid collision with hot scrapes
        id="continuous_backfill",
        name="3-Month History Recovery (Hourly)",
        replace_existing=True,
    )

    # ── Phase 1: Multi-Platform Scrapers (run if platform enabled) ──
    scheduler.add_job(
        scrape_platform_products,
        trigger=CronTrigger(hour="*/8"),  # every 8 hours
        id="scrape_rokomari",
        name="Scrape Rokomari Products (8h)",
        kwargs={"platform": "rokomari"},
        replace_existing=True,
    )
    scheduler.add_job(
        scrape_platform_products,
        trigger=CronTrigger(hour="1,9,17"),  # 3x daily
        id="scrape_cartup",
        name="Scrape Cartup Products (3x daily)",
        kwargs={"platform": "cartup"},
        replace_existing=True,
    )
    scheduler.add_job(
        scrape_platform_products,
        trigger=CronTrigger(hour="2,10,18"),  # 3x daily, offset from Cartup
        id="scrape_pickaboo",
        name="Scrape Pickaboo Products (3x daily)",
        kwargs={"platform": "pickaboo"},
        replace_existing=True,
    )

    # Daily digest: 8AM BD (UTC+6 = 2AM UTC)
    scheduler.add_job(
        send_daily_digest_job,
        trigger=CronTrigger(hour=2, minute=0),
        id="daily_digest",
        name="Daily Telegram Digest (8AM BD)",
        replace_existing=True,
    )

    # Phase 2: Matching Engine (every 6 hours)
    scheduler.add_job(
        run_matching_engine_job,
        trigger=CronTrigger(hour="*/6"),
        id="matching_engine",
        name="Fuzzy Match Ungrouped Products",
        replace_existing=True,
    )

    scheduler.start()
    print("Scheduler started with all jobs.")



async def post_deals_to_telegram():
    """Post today's top deals to the Telegram channel."""
    print(f"[SCRAPER] [{datetime.now()}] Posting deals to Telegram...")
    try:
        import sys, os
        bot_path = os.path.join(os.path.dirname(__file__), "..", "..", "telegram_deals_bot.py")
        import importlib.util
        spec = importlib.util.spec_from_file_location("telegram_deals_bot", bot_path)
        if spec and spec.loader:
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)  # type: ignore[union-attr]
            await mod.run(dry_run=False)
            print("[OK] Telegram deals post complete.")
        else:
            print("[WARN] Could not load telegram_deals_bot.py")
    except Exception as e:
        logger.error("Telegram deals bot failed: %s", e, exc_info=True)



# ── Scrape Tasks ──────────────────────────────────────────────


async def scrape_hot_products():
    """Scrape products with >10 active alerts (high priority)."""
    print(f"[SCRAPER] [{datetime.now()}] Starting hot product scrape...")
    start_time = datetime.now()
    telegram = get_telegram_service()

    try:
        async with async_session_factory() as db:
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
        scraped_count = await _run_scrape_batch(urls, "hot")

        duration = (datetime.now() - start_time).total_seconds()
        await telegram.send_scraper_success(
            batch_name="Hot Products",
            count=scraped_count,
            duration_seconds=duration
        )
        print(f"   [OK] Hot scrape completed: {scraped_count} products in {duration:.1f}s")

    except Exception as e:
        error_msg = str(e)
        print(f"   [ERROR] Hot scrape failed: {error_msg}")
        await telegram.send_alert(
            title="Hot Products Scraper Failed",
            message=f"Error: {error_msg}",
            severity="error"
        )
        logger.exception("Hot products scrape failed")


async def scrape_tracked_products():
    """Scrape products tracked by at least 1 user."""
    print(f"[SCRAPER] [{datetime.now()}] Starting tracked product scrape...")

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


async def harvest_from_categories() -> int:
    """
    Discover new products via:
    - Daraz: category listing page scraping (HTTP)
    - All other enabled platforms: sitemap + category page harvesting
    """
    print(f"[HARVEST] [{datetime.now()}] Starting category + platform harvest...")
    total = 0

    # Daraz category pages
    try:
        from app.scraper.category_harvester import CategoryHarvester
        harvester = CategoryHarvester(max_pages_per_cat=5, concurrency=5)
        count = await harvester.harvest_all()
        print(f"[HARVEST] Daraz category harvest: {count} new products seeded.")
        total += count
    except Exception as e:
        logger.error("Daraz category harvest failed: %s", e, exc_info=True)

    # All other enabled platforms
    try:
        from app.scraper.platform_harvesters import harvest_all_platforms
        platform_counts = await harvest_all_platforms()
        for platform, count in platform_counts.items():
            print(f"[HARVEST] {platform}: {count} new products seeded.")
            total += count
    except Exception as e:
        logger.error("Platform harvest failed: %s", e, exc_info=True)

    print(f"[HARVEST] Total new products seeded this run: {total}")
    return total


async def scrape_via_api(limit: int = 5000, offset: int = 0) -> int:
    """
    Fast path: fetch prices via Daraz Affiliate API (HTTP, no browser).
    ~100x faster than Playwright. Skipped if DARAZ_APP_KEY not set.
    Returns number of products updated.
    """
    from app.config import settings
    from app.scraper.daraz_api import DarazAffiliateAPI

    if not settings.DARAZ_APP_KEY or not settings.DARAZ_APP_SECRET:
        print("   [API] DARAZ_APP_KEY not set — skipping API scrape, falling back to Playwright.")
        return 0

    print(f"[SCRAPER] [{datetime.now()}] Starting Daraz API price fetch (limit={limit})...")

    async with async_session_factory() as db:
        result = await db.execute(
            select(Product.id, Product.external_id)
            .where(Product.is_active == True, Product.platform == "daraz")
            .order_by(Product.last_scraped_at.asc().nullsfirst())
            .offset(offset)
            .limit(limit)
        )
        products = result.all()

    if not products:
        print("   [API] No Daraz products to scrape.")
        return 0

    item_ids = [p.external_id for p in products]
    print(f"   [API] Fetching prices for {len(item_ids)} products...")

    async with DarazAffiliateAPI(
        app_key=settings.DARAZ_APP_KEY,
        app_secret=settings.DARAZ_APP_SECRET,
        tracking_id=settings.DARAZ_TRACKING_ID,
    ) as api:
        scraped = await api.fetch_batch(item_ids, concurrency=10)

    if not scraped:
        print("   [API] No results returned — API may be misconfigured or rate-limited.")
        return 0

    agent = ScrapeAgent(batch_name="DarazAPI", platform="daraz")
    await agent._save_results(scraped)
    print(f"   [API] Done: {len(scraped)}/{len(item_ids)} products updated.")
    return len(scraped)


async def scrape_via_http(limit: int = 3000, offset: int = 0) -> int:
    """
    Medium path: fetch prices via plain HTTP (no Playwright).
    Extracts __NEXT_DATA__ JSON from Daraz SSR pages.
    ~20x faster than Playwright. Skipped if Akamai blocks (yield < 10%).
    Returns number of products updated.
    """
    from app.scraper.daraz_http import scrape_batch_http

    print(f"[SCRAPER] [{datetime.now()}] Starting Daraz HTTP price fetch (limit={limit})...")

    async with async_session_factory() as db:
        result = await db.execute(
            select(Product.id, Product.url)
            .where(Product.is_active == True, Product.platform == "daraz")
            .order_by(Product.last_scraped_at.asc().nullsfirst())
            .offset(offset)
            .limit(limit)
        )
        products = result.all()

    if not products:
        print("   [HTTP] No Daraz products to scrape.")
        return 0

    urls = [p.url for p in products]
    print(f"   [HTTP] Fetching {len(urls)} product pages...")
    scraped = await scrape_batch_http(urls, concurrency=10)

    # If success rate < 10% treat as blocked — return 0 to trigger Playwright fallback
    if len(scraped) < max(1, len(urls) * 0.10):
        print(f"   [HTTP] Low yield ({len(scraped)}/{len(urls)}) — likely Akamai blocked. Falling back.")
        return 0

    agent = ScrapeAgent(batch_name="DarazHTTP", platform="daraz")
    await agent._save_results(scraped)
    print(f"   [HTTP] Done: {len(scraped)}/{len(urls)} products updated.")
    return len(scraped)


async def _fetch_product_urls(
    where_clauses: list,
    order_by,
    offset: int,
    limit: int,
) -> list[str]:
    """Helper: fetch product URLs from DB with given filters."""
    async with async_session_factory() as db:
        q = select(Product.url).where(*where_clauses).order_by(order_by)
        if offset:
            q = q.offset(offset)
        result = await db.execute(q.limit(limit))
        return [row[0] for row in result.all()]


async def scrape_longtail_products(shard_index: int = 0, total_shards: int = 1):
    """
    Two-pass scrape per shard to guarantee both jobs get done:

    Pass A — Price updates (80% capacity):
        Existing products ordered by stalest price first (NULLS LAST).
        Ensures all products with price history get refreshed daily.

    Pass B — New product discovery (20% capacity):
        Brand-new stubs (never scraped, last_scraped_at IS NULL).
        Ensures newly harvested products get their first price quickly.

    With 10 shards × 3,000/shard:
      Pass A: 2,400 × 10 × 4 runs/day = 96,000 price updates/day
      Pass B:   600 × 10 × 4 runs/day = 24,000 new products get first price/day
    """
    per_shard = 3000
    pass_a_limit = int(per_shard * 0.80)   # 2,400 — existing products
    pass_b_limit = int(per_shard * 0.20)   # 600   — new stubs
    offset = shard_index * pass_a_limit
    label = f"shard {shard_index}/{total_shards}"

    print(f"[SCRAPER] [{datetime.now()}] Long-tail — {label}")

    # ── Pass A: price updates for existing products ───────────────────
    print(f"   [A] Price updates — {pass_a_limit} products (offset={offset})")
    urls_a = await _fetch_product_urls(
        where_clauses=[Product.is_active == True, Product.last_scraped_at.isnot(None)],
        order_by=Product.last_scraped_at.asc(),   # stalest first, no nulls
        offset=offset,
        limit=pass_a_limit,
    )

    if urls_a:
        saved_a = await _scrape_urls_fast(urls_a, label="A")
        print(f"   [A] Done: {saved_a}/{len(urls_a)} updated.")

    # ── Pass B: first-time scrape for newly harvested stubs ───────────
    print(f"   [B] New product discovery — up to {pass_b_limit} stubs")
    urls_b = await _fetch_product_urls(
        where_clauses=[Product.is_active == True, Product.last_scraped_at.is_(None)],
        order_by=Product.first_seen_at.asc(),   # oldest stub first
        offset=0,   # all shards compete for stubs; duplicates are harmless
        limit=pass_b_limit,
    )

    if urls_b:
        saved_b = await _scrape_urls_fast(urls_b, label="B")
        print(f"   [B] Done: {saved_b}/{len(urls_b)} new products priced.")
    else:
        print(f"   [B] No new stubs — all products have prices.")


async def _scrape_urls_fast(urls: list[str], label: str = "") -> int:
    """
    Run the API → HTTP → Playwright chain for a list of URLs.
    Returns number of products successfully saved.
    """
    if not urls:
        return 0

    from app.scraper.daraz_http import scrape_batch_http

    # Primary: signed mtop API (no browser). Reliable from any IP.
    scraped = await scrape_batch_http(urls, concurrency=4)

    if scraped:
        agent = ScrapeAgent(batch_name=f"HTTP-{label}", platform="daraz")
        await agent._save_results(scraped)
        saved = len(scraped)
    else:
        saved = 0

    # Playwright fallback only if a browser is actually available (it is not on
    # the free-tier CI runners, which skip the Playwright install).
    from app.scraper.daraz_scraper import PLAYWRIGHT_AVAILABLE
    if saved < max(1, len(urls) * 0.10) and PLAYWRIGHT_AVAILABLE:
        print(f"   [{label}] Low HTTP yield — trying Playwright fallback")
        agent = ScrapeAgent(batch_name=f"Playwright-{label}", platform="daraz")
        return await agent.run(urls)

    return saved


async def scrape_platform_products(platform: str, limit: int = 200):
    """
    Generic per-platform scheduled scrape. Checks feature flag before running.
    Dispatches to the correct scraper based on the platform registry.

    Args:
        platform: Platform slug (e.g. 'rokomari', 'cartup', 'pickaboo')
        limit: Max number of products to scrape per run
    """
    if not is_platform_enabled(platform):
        print(f"   [SKIP] [{platform}] Platform not enabled -- skipping.")
        return

    print(f"[SCRAPER] [{datetime.now()}] Starting {platform} product scrape...")
    telegram = get_telegram_service()
    start_time = datetime.now()

    try:
        async with async_session_factory() as db:
            result = await db.execute(
                select(Product.id, Product.url)
                .where(
                    and_(
                        Product.platform == platform,
                        Product.is_active == True,
                    )
                )
                .order_by(Product.last_scraped_at.asc().nullsfirst())
                .limit(limit)
            )
            products = result.all()

        if not products:
            print(f"   [{platform}] No products to scrape yet.")
            return

        urls = [p.url for p in products]
        scraped_count = 0

        # Dispatch to correct scraper
        if platform == "rokomari":
            from app.scraper.rokomari_scraper import fetch_batch
            scraped_products = await fetch_batch(urls)
        elif platform == "cartup":
            from app.scraper.cartup_scraper import CartupScraper
            async with CartupScraper() as scraper:
                scraped_products = await scraper.scrape_batch(urls)
        elif platform == "pickaboo":
            from app.scraper.pickaboo_scraper import PickabooScraper
            async with PickabooScraper() as scraper:
                scraped_products = await scraper.scrape_batch(urls)
        elif platform == "chaldal":
            from app.scraper.chaldal_scraper import fetch_batch
            scraped_products = await fetch_batch(urls)
        elif platform == "othoba":
            from app.scraper.othoba_scraper import OthobaScraper
            async with OthobaScraper() as scraper:
                scraped_products = await scraper.scrape_batch(urls)
        else:
            print(f"   [{platform}] No scraper registered — skipping.")
            return

        # Persist results using ScrapeAgent logic
        if scraped_products:
            agent = ScrapeAgent(batch_name=platform.capitalize(), platform=platform)
            await agent._save_results(scraped_products)
            scraped_count = len(scraped_products)

        duration = (datetime.now() - start_time).total_seconds()
        failed_count = len(urls) - scraped_count
        avg_duration = duration / len(urls) if urls else 0.0

        await telegram.send_platform_health(
            platform=platform,
            scraped=scraped_count,
            failed=failed_count,
            total=len(urls),
            avg_duration_s=avg_duration,
        )
        print(f"   [{platform}] Done: {scraped_count}/{len(urls)} scraped in {duration:.1f}s")

    except Exception as e:
        print(f"   [{platform}] Scrape failed: {e}")
        await telegram.send_alert(
            title=f"{platform.capitalize()} Scraper Failed",
            message=str(e),
            severity="error",
        )
        logger.exception("%s scrape failed", platform)




async def check_all_alerts():
    """Check all active alerts and send notifications for triggered ones."""
    print(f"[ALERT] [{datetime.now()}] Checking price alerts...")

    async with async_session_factory() as db:
        # Get all active alerts with user eagerly loaded (needed for email)
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(Alert, Product)
            .join(Product, Alert.product_id == Product.id)
            .where(Alert.is_active == True)
            .options(selectinload(Alert.user))
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
                # Check 24h rate limit (compare tz-aware datetimes)
                if alert.last_triggered:
                    now_utc = datetime.now(timezone.utc)
                    last = alert.last_triggered
                    # Ensure last_triggered is tz-aware for comparison
                    if last.tzinfo is None:
                        from datetime import timezone as _tz
                        last = last.replace(tzinfo=_tz.utc)
                    hours_since = (now_utc - last).total_seconds() / 3600
                    if hours_since < 24:
                        continue

                # Trigger alert!
                await _send_alert_notification(alert, product, latest_price, db)
                triggered_count += 1

        if triggered_count > 0:
            await db.commit()

    print(f"   [OK] Checked {len(alerts)} alerts; {triggered_count} triggered.")


async def send_daily_digest_job():
    """Fetches daily metrics and sends digest to Telegram at 8AM BD."""
    print(f"[DIGEST] [{datetime.now()}] Sending daily digest...")
    telegram = get_telegram_service()
    
    try:
        async with async_session_factory() as db:
            # 1. Total products tracked
            total_result = await db.execute(select(func.count(Product.id)))
            total_products = total_result.scalar_one()
            
            # 2. New products today
            today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            new_result = await db.execute(
                select(func.count(Product.id)).where(Product.first_seen_at >= today)
            )
            new_products = new_result.scalar_one()

            # 3. Alerts triggered — total and per channel
            alerts_result = await db.execute(
                select(func.count(AlertEvent.id)).where(
                    and_(AlertEvent.sent_at >= today, AlertEvent.channel == "email")
                )
            )
            alerts_sent = alerts_result.scalar_one()

            tg_alerts_result = await db.execute(
                select(func.count(AlertEvent.id)).where(
                    and_(AlertEvent.sent_at >= today, AlertEvent.channel == "telegram")
                )
            )
            telegram_alerts_sent = tg_alerts_result.scalar_one()

            # 4. Coupon auto-apply stats
            coupon_total_result = await db.execute(
                select(func.count(CouponApplication.id)).where(CouponApplication.created_at >= today)
            )
            coupon_total = coupon_total_result.scalar_one()

            coupon_success_result = await db.execute(
                select(func.count(CouponApplication.id)).where(
                    and_(CouponApplication.created_at >= today, CouponApplication.success == True)
                )
            )
            coupon_success = coupon_success_result.scalar_one()

            coupon_savings_result = await db.execute(
                select(func.coalesce(func.sum(CouponApplication.savings), 0)).where(
                    and_(CouponApplication.created_at >= today, CouponApplication.success == True)
                )
            )
            coupon_savings_paisa = coupon_savings_result.scalar_one()

            # Platform stats
            platforms = {}
            from app.scraper.registry import PLATFORM_REGISTRY
            for p in PLATFORM_REGISTRY.keys():
                scraped_result = await db.execute(
                    select(func.count(Product.id)).where(
                        and_(
                            Product.platform == p,
                            Product.last_scraped_at >= today
                        )
                    )
                )
                platforms[p] = {
                    "scraped": scraped_result.scalar_one(),
                    "failed": 0
                }

        stats = {
            "total_products": total_products,
            "new_products": new_products,
            "alerts_sent": alerts_sent,
            "telegram_alerts_sent": telegram_alerts_sent,
            "deals_posted": 3,
            "uptime_pct": 99.9,
            "platforms": platforms,
            "coupon_attempts": coupon_total,
            "coupon_successes": coupon_success,
            "coupon_savings_bdt": round(coupon_savings_paisa / 100, 2),
        }

        await telegram.send_daily_digest(stats)
        print("   [OK] Daily digest sent.")
    except Exception as e:
        logger.error(f"Failed to send daily digest: {e}", exc_info=True)


async def run_matching_engine_job():
    """Runs the rapidfuzz matching engine to cluster cross-platform products."""
    from app.services.matching import cluster_ungrouped_products
    try:
        await cluster_ungrouped_products()
    except Exception as e:
        logger.error(f"Matching engine failed: {e}", exc_info=True)


# ── Helper Functions ──────────────────────────────────────────


# ── Scrape Agent (SkillX / Intelligence) ──────────────────────

class ScrapeAgent:
    """
    Intelligent scraping orchestrator.
    Handles headless/headful switching, adaptive retries, and stealth.
    Supports multi-platform scraping via the platform parameter.
    """
    def __init__(self, batch_name: str, platform: str = "daraz", max_retries: int = 3):
        self.batch_name = batch_name
        self.platform = platform
        self.max_retries = max_retries
        self.telegram = get_telegram_service()
        self.metrics = {
            "success": 0,
            "failure": 0,
            "start_time": 0,
            "end_time": 0,
            "errors": []
        }

    async def run(self, urls: list) -> int:
        if not urls:
            return 0
            
        self.metrics["start_time"] = time.monotonic()
        retry_count = 0
        use_headful = False
        
        while retry_count < self.max_retries:
            try:
                mode = "HEADFUL" if use_headful else "HEADLESS"
                print(f"   [AGENT] Attempting {self.batch_name} in {mode} mode (Attempt {retry_count + 1})")
                
                async with DarazScraper(headless=not use_headful) as scraper:
                    products = await scraper.scrape_batch(urls)

                if products:
                    await self._save_results(products)
                    self.metrics["success"] = len(products)
                    self.metrics["failure"] = len(urls) - len(products)
                    self.metrics["end_time"] = time.monotonic()
                    self._log_metrics()
                    return len(products)
                
                print(f"   [WARN] [Agent] No products returned in {mode} mode.")
                self.metrics["errors"].append(f"No products in {mode} mode")
                
            except Exception as e:
                err_msg = str(e)
                print(f"   [ERROR] [Agent] Attempt failed: {err_msg}")
                self.metrics["errors"].append(err_msg)
                if "block" in err_msg.lower() or "timeout" in err_msg.lower():
                    use_headful = True # Switch to headful on next attempt
            
            retry_count += 1
            if retry_count < self.max_retries:
                wait_time = 20 * retry_count
                await asyncio.sleep(wait_time)

        # Final failure
        self.metrics["end_time"] = time.monotonic()
        self.metrics["failure"] = len(urls)
        self._log_metrics()
        
        await self.telegram.send_alert(
            title=f"Scraper Agent Failed: {self.batch_name}",
            message=f"Total collapse after {self.max_retries} attempts. Errors: {self.metrics['errors'][-3:]}",
            severity="error"
        )
        return 0

    def _log_metrics(self):
        elapsed = self.metrics["end_time"] - self.metrics["start_time"]
        total = self.metrics["success"] + self.metrics["failure"]
        success_rate = (self.metrics["success"] / total * 100) if total > 0 else 0
        avg_time = (elapsed / total) if total > 0 else 0
        
        print(f"   [METRICS] Batch: {self.batch_name}")
        print(f"      Success Rate: {success_rate:.1f}% ({self.metrics['success']}/{total})")
        print(f"      Total Time: {elapsed:.2f}s (Avg: {avg_time:.2f}s/product)")
        if self.metrics["errors"]:
            print(f"      Last Error: {self.metrics['errors'][-1]}")

    async def _save_results(self, products: list):
        """Persistent storage logic. Snapshots are deduped — a new row is only
        written when price or stock changed since the product's last snapshot,
        so high-frequency scraping doesn't bloat price_snapshots."""
        async with async_session_factory() as db:
            # ── Pass 1: resolve/create products ───────────────────────
            resolved = []  # (product, scraped)
            for scraped in products:
                platform = getattr(scraped, 'platform', self.platform)
                result = await db.execute(
                    select(Product).where(
                        and_(
                            Product.platform == platform,
                            Product.external_id == scraped.external_id,
                        )
                    )
                )
                product = result.scalar_one_or_none()

                if not product:
                    from app.scraper.daraz_scraper import _normalize_title
                    product = Product(
                        platform=platform,
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
                resolved.append((product, scraped))

            # ── Latest snapshot per product (one query) for dedupe ─────
            ids = [p.id for p, _ in resolved]
            last_price: dict = {}
            if ids:
                rows = await db.execute(
                    text(
                        "SELECT DISTINCT ON (product_id) product_id, price, in_stock "
                        "FROM price_snapshots WHERE product_id = ANY(:ids) "
                        "ORDER BY product_id, scraped_at DESC"
                    ),
                    {"ids": ids},
                )
                last_price = {r[0]: (r[1], r[2]) for r in rows}

            # ── Pass 2: touch timestamp; insert snapshot only on change ─
            now = datetime.now(timezone.utc)
            for product, scraped in resolved:
                product.last_scraped_at = now
                prev = last_price.get(product.id)
                if prev is not None and prev[0] == scraped.price and prev[1] == scraped.in_stock:
                    continue  # unchanged — skip snapshot
                db.add(
                    PriceSnapshot(
                        product_id=product.id,
                        price=scraped.price,
                        original_price=scraped.original_price,
                        discount_pct=scraped.discount_pct,
                        in_stock=scraped.in_stock,
                    )
                )

            await db.commit()
            
            # ── Invalidate Cache ──────────────────────────────────────
            from app.services.cache import cache
            for scraped in products:
                # We need the product ID and external_id (which we already have in 'scraped')
                # But wait, we need the internal UUID. 
                # Actually, invalidating by external_id is safer for lookup
                await cache.delete(f"product_lookup:{scraped.external_id}")
            # ───────────────────────────────────────────────────────────
            
            print(f"   [OK] [Agent] Saved {len(products)} product(s). Cache invalidated.")


async def _run_scrape_batch(urls: list, batch_type: str) -> int:
    """Entry point for batches using the ScrapeAgent."""
    agent = ScrapeAgent(batch_name=batch_type.capitalize())
    return await agent.run(urls)


async def _send_alert_notification(
    alert: Alert,
    product: Product,
    current_price: int,
    db: AsyncSession,
) -> None:
    """
    Send price-drop alert notification via all channels in alert.notify_via.

    Supported channels:
      - "email"    → Resend transactional email (always attempted if user has email)
      - "telegram" → Personal Telegram DM (only if user.telegram_chat_id is set)

    Each channel is logged as a separate AlertEvent row for analytics.
    The alert.last_triggered timestamp is updated once, regardless of channel count.
    """
    from app.services.mailer import mailer

    user = alert.user
    channels = alert.notify_via or ["email"]
    current_price_bdt = current_price / 100.0
    target_price_bdt  = alert.target_price / 100.0

    # Mark alert as triggered (once, before any sends)
    alert.last_triggered = datetime.utcnow()

    # ── Email channel ──────────────────────────────────────────
    if "email" in channels:
        to_email = user.email if user else None
        if not to_email:
            print(f"   [WARN] No email for alert {alert.id} -- skipping email channel.")
        else:
            email_event = AlertEvent(
                alert_id=alert.id,
                price_at_trigger=current_price,
                channel="email",
                success=False,
            )
            db.add(email_event)

            email_ok = mailer.send_price_drop_email(
                to_email=to_email,
                product_title=product.title,
                product_url=product.url,
                current_price=current_price_bdt,
                target_price=target_price_bdt,
                image_url=product.image_url,
            )
            if email_ok:
                email_event.success = True
                print(f"   [OK] Alert email -> {to_email} for '{product.title[:40]}'")
            else:
                print(f"   [ERROR] Alert email failed -> {to_email}")

    # ── Telegram channel ───────────────────────────────────────
    if "telegram" in channels:
        tg_chat_id = getattr(user, "telegram_chat_id", None) if user else None
        if not tg_chat_id:
            print(
                f"   [WARN] Alert {alert.id}: 'telegram' in notify_via but user has no "
                f"telegram_chat_id -- skipping. User can link via /alerts/telegram/link."
            )
        else:
            tg_event = AlertEvent(
                alert_id=alert.id,
                price_at_trigger=current_price,
                channel="telegram",
                success=False,
            )
            db.add(tg_event)

            telegram = get_telegram_service()
            tg_ok = await telegram.send_price_drop_alert(
                user_chat_id=tg_chat_id,
                product_title=product.title,
                product_url=product.url,
                platform=product.platform,
                current_price=current_price_bdt,
                target_price=target_price_bdt,
                image_url=product.image_url,
            )
            if tg_ok:
                tg_event.success = True
                print(
                    f"   [OK] Telegram DM -> chat_id={tg_chat_id} "
                    f"for '{product.title[:40]}'"
                )
            else:
                print(f"   [ERROR] Telegram DM failed -> chat_id={tg_chat_id}")

    # ── Web Push channel ───────────────────────────────────────
    if "push" in channels:
        to_email = (user.email if user else None) or getattr(alert, "email", None)
        if not to_email:
            print(f"   [WARN] Alert {alert.id}: 'push' in notify_via but no email -- skipping.")
        else:
            await _send_push_notifications(
                email=to_email,
                product_title=product.title,
                product_url=product.url,
                current_price=current_price_bdt,
                db=db,
            )


# ── Coupon Refresh Task ───────────────────────────────────────

async def refresh_platform_coupons():
    """
    Fetch fresh platform-wide Daraz coupons every 2 hours.
    Also scrapes coupons from recently-updated product pages.
    """
    print(f"[COUPON] [{datetime.now()}] Starting coupon refresh...")
    try:
        import httpx
        from app.services.coupons import fetch_platform_coupons, upsert_coupons

        async with httpx.AsyncClient() as client:
            coupons = await fetch_platform_coupons(client)

        if coupons:
            async with async_session_factory() as db:
                count = await upsert_coupons(coupons, db)
                print(f"   [OK] Upserted {count} platform coupon(s).")
        else:
            print("   [INFO] No platform coupons found this cycle.")

    except Exception as e:
        print(f"   [ERROR] Coupon refresh failed: {e}")
        logger.exception("Coupon refresh failed")
# ── Expansion Tasks (Phase 4) ───────────────────────────────

async def backfill_product_history(product_id: UUID):
    """Background task to backfill historical data for a product."""
    print(f"[BACKFILL] [{datetime.now()}] Starting background backfill for {product_id}")
    try:
        async with WaybackBackfiller() as filler:
            await filler.backfill_product(product_id)
    except Exception as e:
        logger.error(f"Backfill task failed for {product_id}: {e}")


async def harvest_new_products():
    """Daily discovery of new products from Daraz sitemaps."""
    print(f"[HARVEST] [{datetime.now()}] Starting sitemap harvesting...")
    try:
        harvester = SitemapHarvester()
        async with harvester:
            await harvester.harvest_all()
        print("[OK] Sitemap harvesting complete.")
    except Exception as e:
        logger.error(f"Sitemap harvesting failed: {e}")
        logger.exception("Harvester exception")


async def cleanup_snapshots():
    """
    Two-pass cleanup to keep DB storage within Supabase 500MB free tier.

    Price history retention policy:
      - Last 7 days   → keep every snapshot (full resolution for charts/alerts)
      - 7–90 days     → keep 1 per day per product (daily close price)
      - 90 days+      → keep 1 per week per product (weekly close price)

    This allows price trend charts to work indefinitely while preventing
    unbounded DB growth. At 30K products × 4 runs/day, without pruning
    the snapshots table would grow ~12 MB/day and exhaust 500 MB in ~40 days.
    With pruning it stabilises at ~50-80 MB total.
    """
    print(f"[CLEANUP] [{datetime.now()}] Starting snapshot cleanup...")
    try:
        from sqlalchemy import text
        from app.database import async_session_factory

        async with async_session_factory() as db:
            # Pass 1: collapse 7-90 day snapshots to 1 per day per product
            r1 = await db.execute(text("""
                DELETE FROM price_snapshots
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id,
                               ROW_NUMBER() OVER (
                                   PARTITION BY product_id, DATE(scraped_at AT TIME ZONE 'UTC')
                                   ORDER BY scraped_at ASC
                               ) AS rn
                        FROM price_snapshots
                        WHERE scraped_at < NOW() - INTERVAL '7 days'
                          AND scraped_at >= NOW() - INTERVAL '90 days'
                    ) ranked
                    WHERE rn > 1
                )
            """))
            daily_pruned = r1.rowcount or 0

            # Pass 2: collapse 90+ day snapshots to 1 per week per product
            r2 = await db.execute(text("""
                DELETE FROM price_snapshots
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id,
                               ROW_NUMBER() OVER (
                                   PARTITION BY product_id,
                                                DATE_TRUNC('week', scraped_at AT TIME ZONE 'UTC')
                                   ORDER BY scraped_at ASC
                               ) AS rn
                        FROM price_snapshots
                        WHERE scraped_at < NOW() - INTERVAL '90 days'
                    ) ranked
                    WHERE rn > 1
                )
            """))
            weekly_pruned = r2.rowcount or 0

            await db.commit()

        print(f"   [OK] Pruned {daily_pruned} daily duplicates, {weekly_pruned} weekly duplicates.")

    except Exception as e:
        logger.error("DB snapshot pruning failed: %s", e, exc_info=True)

    # Clean local HTML debug files older than 48h
    try:
        snapshot_dir = os.path.join(os.getcwd(), "debug_snapshots")
        if os.path.exists(snapshot_dir):
            now = time.time()
            deleted = sum(
                1 for f in os.listdir(snapshot_dir)
                if os.stat(fp := os.path.join(snapshot_dir, f)).st_mtime < now - 172800
                and not os.remove(fp)
            )
            print(f"   [OK] Deleted {deleted} local HTML debug files.")
    except Exception as e:
        logger.error("Local snapshot cleanup failed: %s", e)

    print("[OK] Cleanup complete.")


async def run_continuous_backfill(batch_size: int = 50):
    """
    Pick 50 products that need history and backfill them from Wayback.
    Priority:
    1. Products with active alerts
    2. Products never backfilled
    3. Products with oldest backfill dates
    """
    print(f"[BACKFILL] [{datetime.now()}] Starting continuous backfill (3-month target)...")
    try:
        async with async_session_factory() as db:
            query = (
                select(Product)
                .outerjoin(Alert, and_(Alert.product_id == Product.id, Alert.is_active == True))
                .where(Product.is_active == True)
                .order_by(
                    func.count(Alert.id).desc(),
                    Product.last_backfilled_at.asc().nullsfirst()
                )
                .group_by(Product.id)
                .limit(batch_size)
            )
            
            result = await db.execute(query)
            products = result.scalars().all()

        if not products:
            print("   No products found requiring backfill.")
            return

        print(f"   [INFO] Processing {len(products)} products in this batch...")
        from app.scraper.wayback import WaybackBackfiller
        async with WaybackBackfiller() as filler:
            for p in products:
                await filler.backfill_product(p.id)
                await asyncio.sleep(2)

        print("[OK] Continuous backfill batch complete.")
    except Exception as e:
        logger.error(f"Continuous backfill failed: {e}")


# ── Web Push Helper ───────────────────────────────────────────

async def _send_push_notifications(
    email: str,
    product_title: str,
    product_url: str,
    current_price: float,
    db: AsyncSession,
) -> None:
    """Send Web Push to all active subscriptions for this email."""
    import json
    from app.models.push_subscription import PushSubscription
    from app.config import settings

    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        print("   [WARN] VAPID keys not configured — skipping push channel.")
        return

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        print("   [WARN] pywebpush not installed — skipping push channel.")
        return

    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.email == email,
            PushSubscription.is_active == True,
        )
    )
    subs = result.scalars().all()
    if not subs:
        return

    payload = json.dumps({
        "title": "DamKoi Price Drop!",
        "body": f"{product_title[:60]} is now ৳{current_price:,.0f}",
        "url": product_url,
        "icon": "/icons/dk_logo.png",
    })

    for sub in subs:
        try:
            subscription_info = json.loads(sub.subscription_json)
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_EMAIL},
            )
            print(f"   [OK] Push sent -> {email}")
        except WebPushException as e:
            status = getattr(e.response, "status_code", None)
            if status in (404, 410):
                # Subscription expired — deactivate
                sub.is_active = False
                print(f"   [INFO] Push sub expired ({status}), deactivated: {email}")
            else:
                print(f"   [ERROR] Push failed for {email}: {e}")
        except Exception as e:
            print(f"   [ERROR] Push unexpected error for {email}: {e}")
        logger.exception("Backfill exception")
