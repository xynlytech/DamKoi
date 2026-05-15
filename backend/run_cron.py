"""
DamKoi — Cron Scraper Entry Point

Called by GitHub Actions on a schedule to:
1. Harvest new product URLs from Daraz sitemap (HTTP only, no Playwright)
2. Scrape prices for all active products (Playwright)
3. Check alerts and send notifications

Usage:
    python run_cron.py [harvest|scrape|alerts|all]
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))


async def run_harvest():
    from app.scraper.tasks import harvest_new_products
    print("[cron] Harvesting new product URLs from sitemaps...")
    await harvest_new_products()
    print("[cron] Harvest done.")


async def run_scrape():
    from app.scraper.tasks import scrape_hot_products, scrape_longtail_products
    print("[cron] Scraping hot products...")
    await scrape_hot_products()
    print("[cron] Scraping all active products (longtail)...")
    await scrape_longtail_products()
    print("[cron] Scrape done.")


async def run_alerts():
    from app.scraper.tasks import check_all_alerts
    print("[cron] Checking alerts...")
    await check_all_alerts()
    print("[cron] Alert check done.")


async def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"

    if cmd == "harvest":
        await run_harvest()
    elif cmd == "scrape":
        await run_scrape()
    elif cmd == "alerts":
        await run_alerts()
    else:  # all
        await run_harvest()
        await run_scrape()
        await run_alerts()


if __name__ == "__main__":
    asyncio.run(main())
