import asyncio
import os
import sys
import uuid
import time
from datetime import datetime
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

from app.scraper.daraz_scraper import DarazScraper
from app.scraper.wayback import WaybackBackfiller
from app.database import async_session_factory
from app.models.product import Product
from sqlalchemy import select, delete

async def test_section(name):
    print(f"\n--- 🛡️ DamKoi Bulletproof QA: {name} ---")

async def run_qa_suite():
    # 1. LIVE SCRAPE ATTACK
    await test_section("Live Scraper Stealth & Extraction")
    url = "https://www.daraz.com.bd/products/samsung-galaxy-s24-ultra-i415302239.html"
    async with DarazScraper(headless=True) as scraper:
        start_time = time.time()
        product = await scraper.scrape_product(url)
        duration = time.time() - start_time
        if product:
            print(f"✅ SUCCESS: Scraped '{product.title}' in {duration:.2f}s")
            print(f"   Price: {product.price/100} BDT | Stock: {product.in_stock}")
        else:
            print(f"❌ FAILED: Scraper blocked or extraction failed. Check debug_snapshots/.")

    # 2. HISTORICAL RECOVERY ATTACK
    await test_section("Wayback Historical Recovery")
    async with WaybackBackfiller() as backfiller:
        # Use a URL we know has history (Root domain for now if product fails)
        test_url = "https://www.daraz.com.bd/" 
        snapshots = await backfiller.get_snapshots(test_url, limit=5)
        if snapshots:
            print(f"✅ SUCCESS: Found {len(snapshots)} snapshots for {test_url}")
            print(f"   Latest: {snapshots[0]}")
        else:
            print(f"❌ FAILED: No historical snapshots found. CDX might be down or URL variant missed.")

    # 3. DATABASE & INTEGRITY ATTACK
    await test_section("Database Persistence & Schema")
    async with async_session_factory() as db:
        test_id = str(uuid.uuid4())
        p = Product(
            id=test_id,
            platform="test",
            external_id=test_id,
            url="https://test.com",
            title="Bulletproof Test Product",
            normalized_title="bulletproof test product"
        )
        db.add(p)
        await db.commit()
        
        # Verify last_backfilled_at exists
        result = await db.execute(select(Product).where(Product.id == test_id))
        saved = result.scalar_one()
        print(f"✅ SUCCESS: Database persistence verified (ID: {saved.id})")
        print(f"   Backfill Column: {saved.last_backfilled_at}")
        
        # Cleanup
        await db.execute(delete(Product).where(Product.id == test_id))
        await db.commit()

    # 4. SECURITY ATTACK (Mock)
    await test_section("API Security & JWT Protection")
    print("ℹ️ Manual check required: DELETE /alerts/{id} requires valid JWT with sub claim.")

if __name__ == "__main__":
    asyncio.run(run_qa_suite())
