"""
DamKoi — Cron Scraper Entry Point

Called by GitHub Actions on a schedule to:
1. Harvest new product URLs (sitemap + category pages)
2. Scrape prices for active products (sharded across parallel GH jobs)
3. Check alerts and send notifications

Usage:
    python run_cron.py harvest
    python run_cron.py scrape [shard_index] [total_shards]
    python run_cron.py alerts
    python run_cron.py all

Examples:
    python run_cron.py scrape 0 3   # shard 0 of 3 (products 0-2999)
    python run_cron.py scrape 1 3   # shard 1 of 3 (products 3000-5999)
    python run_cron.py scrape 2 3   # shard 2 of 3 (products 6000-8999)
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))


async def run_harvest():
    from app.scraper.tasks import harvest_new_products, harvest_from_categories
    print("[cron] Harvesting from Daraz sitemaps...")
    await harvest_new_products()
    print("[cron] Harvesting from Daraz category pages...")
    await harvest_from_categories()
    print("[cron] Harvest done.")


async def run_scrape(shard_index: int = 0, total_shards: int = 1):
    from app.scraper.tasks import (
        scrape_hot_products,
        scrape_tracked_products,
        scrape_longtail_products,
    )
    # Shard 0 handles priority products first:
    #   hot (10+ alerts) and tracked (1+ alert) — must be fresh before alert checks run
    if shard_index == 0:
        print("[cron] Scraping hot products (shard 0 priority)...")
        await scrape_hot_products()
        print("[cron] Scraping tracked products (shard 0 priority)...")
        await scrape_tracked_products()
    print(f"[cron] Scraping longtail products (shard {shard_index}/{total_shards})...")
    await scrape_longtail_products(shard_index=shard_index, total_shards=total_shards)
    print("[cron] Scrape done.")


async def run_alerts():
    from app.scraper.tasks import check_all_alerts
    print("[cron] Checking alerts...")
    await check_all_alerts()
    print("[cron] Alert check done.")


async def main():
    args = sys.argv[1:]
    cmd = args[0] if args else "all"

    if cmd == "harvest":
        await run_harvest()
    elif cmd == "scrape":
        shard_index = int(args[1]) if len(args) > 1 else 0
        total_shards = int(args[2]) if len(args) > 2 else 1
        await run_scrape(shard_index=shard_index, total_shards=total_shards)
    elif cmd == "alerts":
        await run_alerts()
    else:  # all
        await run_harvest()
        await run_scrape()
        await run_alerts()


if __name__ == "__main__":
    asyncio.run(main())
