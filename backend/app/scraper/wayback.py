import asyncio
from uuid import UUID
import logging
import re
import aiohttp
from datetime import datetime
from typing import List, Optional
from app.database import async_session_factory
from app.models.price_snapshot import PriceSnapshot
from app.models.product import Product
from sqlalchemy import select

log = logging.getLogger("damkoi.wayback")
logging.basicConfig(level=logging.INFO)

class WaybackBackfiller:
    """Recovers historical price data from archive.org snapshots."""
    
    CDX_BASE = "https://web.archive.org/cdx/search/cdx"
    RAW_BASE = "https://web.archive.org/web/{ts}id_/{url}"

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(headers={"User-Agent": "DamKoi/1.0 (Bangladesh Price Tracker)"})
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def get_snapshots(self, url: str, limit: int = 100) -> List[str]:
        """Fetch list of timestamps for a URL from CDX API."""
        # 1. Strip query params — Wayback CDX is sensitive to exact matches
        clean_url = url.split('?')[0]
        
        params = {
            "url": clean_url,
            "output": "json",
            "fl": "timestamp",
            "limit": -limit, 
            "filter": "statuscode:200",
            "collapse": "timestamp:8" # One per day
        }
        
        async def query(p):
            try:
                async with self.session.get(self.CDX_BASE, params=p, timeout=20) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if len(data) > 1:
                            return [row[0] for row in data[1:]]
            except Exception as e:
                log.warning(f"Wayback CDX failed for {p.get('url')}: {e}")
            return []

        # Try exact match first
        snapshots = await query(params)
        
        # If no snapshots, try prefix match (handles trailing slashes, etc.)
        if not snapshots:
            params["matchType"] = "prefix"
            snapshots = await query(params)
            
        return snapshots

    async def fetch_price(self, url: str, timestamp: str) -> Optional[int]:
        """Fetch raw HTML from a snapshot and extract price via regex."""
        archive_url = self.RAW_BASE.format(ts=timestamp, url=url)
        try:
            async with self.session.get(archive_url, timeout=40) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    
                    # Pattern 1: JSON module data (common in 2023-2024)
                    # Handle both "price":1234 and "price":"1234"
                    match = re.search(r'\"price\":\{\"priceText\":\"[^\"]+\",\"price\":(\d+)\}', html)
                    if match:
                        return int(match.group(1))
                    
                    # Pattern 2: Meta tags (og:price:amount)
                    match = re.search(r'<meta[^>]+property=\"og:price:amount\"[^>]+content=\"([\d\.]+)\"', html)
                    if match:
                        return int(float(match.group(1)) * 100) # Convert to paisa

                    # Pattern 3: Simple JSON "price": 1234
                    match = re.search(r'\"price\":(\d+),', html)
                    if match:
                        val = int(match.group(1))
                        if val > 100: return val

                    # Pattern 4: Alternative meta/json path for older Daraz
                    match = re.search(r'\"skuInfos\":\[\{[^\}]+\"price\":(\d+)', html)
                    if match:
                        return int(match.group(1))

        except Exception as e:
            log.debug(f"Failed to fetch price from snapshot {timestamp}: {e}")
        return None

    async def backfill_product(self, product_id: UUID):
        """Fetch and store all available Wayback history for a specific product ID."""
        from datetime import timezone
        async with async_session_factory() as db:
            result = await db.execute(select(Product).where(Product.id == product_id))
            product = result.scalar_one_or_none()
            if not product:
                log.error(f"Product {product_id} not found for backfill.")
                return

            # Update backfilled_at immediately to mark it as "in progress" or "attempted"
            product.last_backfilled_at = datetime.now(timezone.utc)
            await db.flush()

            # Merge Wayback history into the compact price_history series.
            from app.models.price_history import PriceHistory
            ph = (await db.execute(
                select(PriceHistory).where(PriceHistory.product_id == product_id)
            )).scalar_one_or_none()
            existing = list(ph.series) if ph and ph.series else []
            existing_days = {pt[0] for pt in existing}

            log.info(f"🔍 Backfilling history for: {product.title[:40]}...")
            timestamps = await self.get_snapshots(product.url)

            if not timestamps:
                log.info(f"   ℹ️ No archive history found for this URL.")
                await db.commit()
                return

            added = []
            for ts in timestamps:
                dt = datetime.strptime(ts, "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
                day = int(dt.timestamp() // 86400)
                if day in existing_days:
                    continue
                price = await self.fetch_price(product.url, ts)
                if price:
                    added.append([day, price])
                    existing_days.add(day)
                    await asyncio.sleep(1.0)  # be polite to archive.org

            if added:
                # Merge, sort by day, collapse consecutive equal prices.
                merged = sorted(existing + added, key=lambda x: x[0])
                deduped, last = [], None
                for d, p in merged:
                    if p != last:
                        deduped.append([d, p])
                        last = p
                if ph:
                    ph.series = deduped
                    ph.point_count = len(deduped)
                    ph.updated_at = datetime.now(timezone.utc)
                else:
                    db.add(PriceHistory(product_id=product_id, series=deduped, point_count=len(deduped)))
                await db.commit()
                log.info(f"   ✅ Merged {len(added)} historical points into series.")
            else:
                await db.commit()
                log.info(f"   ℹ️ No new historical data points to add.")

async def backfill_all_products(limit: int = 50):
    """Main entry point to backfill all products in the database."""
    async with WaybackBackfiller() as filler:
        async with async_session_factory() as db:
            # Find products with fewest snapshots first
            result = await db.execute(select(Product).limit(limit))
            products = result.scalars().all()
            
            for p in products:
                await filler.backfill_product(p.id)
                await asyncio.sleep(2) # Cooldown between products

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # Allow passing a specific product UUID
        try:
            prod_id = UUID(sys.argv[1])
            async def run_single():
                async with WaybackBackfiller() as filler:
                    await filler.backfill_product(prod_id)
            asyncio.run(run_single())
        except ValueError:
            print("Invalid UUID provided.")
    else:
        asyncio.run(backfill_all_products())
