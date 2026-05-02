"""
DamKoi — Database Seeder (HTTP-only, no Playwright)

Two phases:
  1. Discover product URLs from Daraz sitemaps via plain HTTP + gzip
  2. Bulk scrape each URL through DarazScraper and write to DB

Usage:
  python3 -m app.scraper.seed               # Discover + print URLs only
  python3 -m app.scraper.seed --scrape      # Discover + actually scrape into DB
  python3 -m app.scraper.seed --urls 500    # Limit to 500 URLs
  python3 -m app.scraper.seed --workers 5   # Concurrency (default 3)
  python3 -m app.scraper.seed --resume      # Skip URLs already in DB
"""

import argparse
import asyncio
import gzip
import logging
import re
import sys
import time
from typing import Optional, Set

import httpx

log = logging.getLogger("damkoi.seed")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)

# ── Constants ─────────────────────────────────────────────────

# Daraz BD sitemap index — publicly accessible without JS
SITEMAP_INDEX = "https://www.daraz.com.bd/sitemap-product-all.xml"

HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
}

PRODUCT_URL_RE = re.compile(r"i(\d+)(?:-s\d+)?\.html")

def url_to_ext_id(url: str) -> Optional[str]:
    m = PRODUCT_URL_RE.search(url)
    return m.group(1) if m else None


# ── HTTP helpers ──────────────────────────────────────────────

async def fetch_bytes(url: str, client: httpx.AsyncClient) -> bytes:
    """Fetch URL, transparently decompress gzip."""
    try:
        r = await client.get(url, headers=HTTP_HEADERS, timeout=30.0, follow_redirects=True)
        r.raise_for_status()
        content = r.content
        if content[:2] == b"\x1f\x8b":
            content = gzip.decompress(content)
        log.debug("  GET %s → %d bytes", url[-60:], len(content))
        return content
    except Exception as e:
        log.warning("  ⚠️  fetch failed: %s — %s", url[-60:], e)
        return b""


def extract_locs(xml_bytes: bytes) -> list[str]:
    text = xml_bytes.decode("utf-8", errors="ignore")
    return re.findall(r"<loc>\s*(https?://[^\s<]+)\s*</loc>", text, re.IGNORECASE)


# ── Phase 1: URL Discovery ────────────────────────────────────

async def discover_product_urls(max_urls: int = 1000) -> Set[str]:
    """
    Crawl Daraz sitemap tree → collect product URLs.

    Flow:
      sitemap-product-all.xml
        └─ sitemap-product-all-N.xml (or .xml.gz)
             └─ https://www.daraz.com.bd/iXXXXXX-sYYYYY.html
    """
    product_urls: Set[str] = set()

    async with httpx.AsyncClient(http2=True) as client:
        log.info("📡 Fetching sitemap index: %s", SITEMAP_INDEX)
        index_bytes = await fetch_bytes(SITEMAP_INDEX, client)
        leaf_sitemaps = [
            u for u in extract_locs(index_bytes)
            if ".xml" in u and "product" in u.lower()
        ]
        log.info("🗺  Found %d leaf sitemaps", len(leaf_sitemaps))

        for sitemap_url in leaf_sitemaps:
            if len(product_urls) >= max_urls:
                break

            log.info("  📥 %s  (collected so far: %d)", sitemap_url[-70:], len(product_urls))
            content = await fetch_bytes(sitemap_url, client)
            locs = extract_locs(content)

            added = 0
            for url in locs:
                if len(product_urls) >= max_urls:
                    break
                if PRODUCT_URL_RE.search(url):
                    product_urls.add(url)
                    added += 1

            log.info("     +%d new URLs from this sitemap", added)
            await asyncio.sleep(0.3)  # be polite

    log.info("✅ Discovered %d product URLs total", len(product_urls))
    return product_urls


# ── Phase 2: Bulk Scrape ──────────────────────────────────────

async def bulk_scrape(
    urls: Set[str],
    max_workers: int = 3,
    resume: bool = True,
    args = None
) -> tuple:
    """
    Scrape each URL through DarazScraper and write to DB.
    Returns (success_count, fail_count).
    """
    from app.scraper.daraz_scraper import DarazScraper
    from app.database import async_session_factory
    from app.models.product import Product
    from sqlalchemy import select

    # If resume=True, skip URLs already in DB
    existing_ids: Set[str] = set()
    if resume:
        log.info("🔎 Checking DB for existing product IDs…")
        async with async_session_factory() as db:
            result = await db.execute(select(Product.external_id))
            existing_ids = {row[0] for row in result.fetchall()}
        log.info("   Skipping %d already-tracked products", len(existing_ids))

    pending = [u for u in urls if url_to_ext_id(u) not in existing_ids]
    log.info("🚀 Scraping %d URLs (workers=%d)", len(pending), max_workers)

    success = 0
    fail = 0
    sem = asyncio.Semaphore(max_workers)
    start = time.monotonic()

    async with DarazScraper(headless=True) as scraper:
        async def scrape_one(url: str) -> bool:
            async with sem:
                try:
                    scraped = await scraper.scrape_product(url)
                    if not scraped:
                        return False

                    # ── Save to DB (same upsert pattern as tasks.py) ──
                    from app.models.product import Product
                    from app.models.price_snapshot import PriceSnapshot
                    from app.scraper.daraz_scraper import _normalize_title
                    from sqlalchemy import select, and_
                    from datetime import datetime

                    async with async_session_factory() as db:
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
                            product = Product(
                                platform="daraz",
                                external_id=scraped.external_id,
                                url=scraped.url,
                                title=scraped.title,
                                normalized_title=_normalize_title(scraped.title),
                                category=scraped.category,
                                brand=scraped.brand,
                                model_number=getattr(scraped, 'model_number', None),
                                image_url=scraped.image_url,
                            )
                            db.add(product)
                            await db.flush()

                        product.last_scraped_at = datetime.utcnow()

                        # ── Price Snapshots ──
                        if getattr(args, 'history', False):
                            # Generate 90 days of synthetic history
                            from datetime import timedelta
                            import random
                            base_price = scraped.price
                            snapshots_to_add = []
                            for days_back in range(90, 0, -1):
                                # Random fluctuation +/- 5%
                                factor = random.uniform(0.95, 1.05)
                                if days_back == 30: factor = 1.1 # Simulate a past hike
                                if days_back == 7:  factor = 0.9 # Simulate a recent drop
                                
                                hist_price = int(base_price * factor)
                                ts = datetime.utcnow() - timedelta(days=days_back)
                                snapshots_to_add.append(PriceSnapshot(
                                    product_id=product.id,
                                    price=hist_price,
                                    original_price=scraped.original_price,
                                    scraped_at=ts
                                ))
                            db.add_all(snapshots_to_add)
                        
                        # Current snapshot
                        snapshot = PriceSnapshot(
                            product_id=product.id,
                            price=scraped.price,
                            original_price=scraped.original_price,
                            discount_pct=scraped.discount_pct,
                            in_stock=scraped.in_stock,
                        )
                        db.add(snapshot)
                        await db.commit()

                    return True

                except Exception as e:
                    log.warning("  ❌ %s — %s", url[-60:], e)
                    return False

        tasks = [asyncio.create_task(scrape_one(u)) for u in pending]

        for i, coro in enumerate(asyncio.as_completed(tasks), 1):
            ok = await coro
            if ok:
                success += 1
            else:
                fail += 1

            # Progress every 10 items
            if i % 10 == 0 or i == len(pending):
                elapsed = time.monotonic() - start
                rate = i / elapsed if elapsed > 0 else 0
                eta = (len(pending) - i) / rate if rate > 0 else 0
                log.info(
                    "  [%d/%d] ✅%d ❌%d  %.1f/min  ETA: %dm",
                    i, len(pending), success, fail, rate * 60, eta / 60,
                )

    return success, fail


# ── CLI entry point ───────────────────────────────────────────

async def main() -> None:
    parser = argparse.ArgumentParser(description="DamKoi Database Seeder")
    parser.add_argument("--urls",    type=int,  default=500,  help="Max URLs to collect (default 500)")
    parser.add_argument("--workers", type=int,  default=3,    help="Concurrent scrapers (default 3)")
    parser.add_argument("--scrape",  action="store_true",     help="Scrape products into DB after discovery")
    parser.add_argument("--resume",  action="store_true",     help="Skip products already in DB")
    parser.add_argument("--save",    type=str,  default="",   help="Save discovered URLs to file")
    parser.add_argument("--history", action="store_true",     help="Generate 90 days of synthetic price history")
    args = parser.parse_args()

    log.info("=" * 60)
    log.info("DamKoi Seeder  |  target=%d  scrape=%s", args.urls, args.scrape)
    log.info("=" * 60)

    # Phase 1
    product_urls = await discover_product_urls(max_urls=args.urls)

    if args.save:
        with open(args.save, "w") as f:
            f.writelines(u + "\n" for u in product_urls)
        log.info("💾 Saved %d URLs to %s", len(product_urls), args.save)

    if not args.scrape:
        log.info("ℹ️  Pass --scrape to insert into DB. Exiting.")
        log.info("   Sample URLs:")
        for url in list(product_urls)[:5]:
            log.info("   %s", url)
        return

    # Phase 2
    success, fail = await bulk_scrape(
        product_urls,
        max_workers=args.workers,
        resume=args.resume,
        args=args
    )

    log.info("=" * 60)
    log.info("🎉 Seeder complete: %d scraped  %d failed  (%.0f%% success)",
             success, fail, 100 * success / max(1, success + fail))
    log.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
