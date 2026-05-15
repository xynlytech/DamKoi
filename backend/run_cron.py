"""
DamKoi — Cron Scraper Entry Point

Called by GitHub Actions on a schedule to:
1. Re-scrape all active products and record new price snapshots
2. Check alerts and send notifications

Usage:
    python run_cron.py [scrape|alerts|all]
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))


async def run_scrape():
    from app.scraper.tasks import scrape_tracked_products, scrape_hot_products
    print("[cron] Scraping hot products...")
    await scrape_hot_products()
    print("[cron] Scraping tracked products...")
    await scrape_tracked_products()
    print("[cron] Scrape done.")


async def run_alerts():
    from app.scraper.tasks import check_all_alerts
    print("[cron] Checking alerts...")
    await check_all_alerts()
    print("[cron] Alert check done.")


async def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"

    if cmd == "scrape":
        await run_scrape()
    elif cmd == "alerts":
        await run_alerts()
    else:  # all
        await run_scrape()
        await run_alerts()


if __name__ == "__main__":
    asyncio.run(main())
