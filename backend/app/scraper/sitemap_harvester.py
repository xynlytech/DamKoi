import asyncio
import logging
import re
from datetime import datetime
from typing import Optional, Set, List

import aiohttp
from sqlalchemy import select

from app.database import async_session_factory
from app.models.product import Product

log = logging.getLogger("damkoi.harvester")
logging.basicConfig(level=logging.INFO)

class SitemapHarvester:
    """Discovers millions of Daraz product URLs by harvesting archived sitemaps."""
    
    CDX_API = "https://web.archive.org/cdx/search/cdx"
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(headers={"User-Agent": "DamKoi/1.0"})
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def discover_archived_sitemaps(self) -> List[str]:
        """Find all archived XML sitemap URLs for Daraz BD."""
        params = {
            "url": "https://www.daraz.com.bd/",
            "matchType": "prefix",
            "output": "json",
            "fl": "original",
            "collapse": "urlkey",
            "filter": "mimetype:text/xml"
        }
        log.info("📡 Searching Wayback for all Daraz sitemaps...")
        try:
            async with self.session.get(self.CDX_API, params=params, timeout=30) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if len(data) > 1:
                        sitemaps = [row[0] for row in data[1:] if "sitemap" in row[0].lower()]
                        log.info(f"✅ Found {len(sitemaps)} unique archived sitemap URLs.")
                        return sitemaps
        except Exception as e:
            log.error(f"Failed to discovery sitemaps: {e}")
        return []

    async def extract_urls_from_sitemap(self, sitemap_url: str) -> Set[str]:
        """Fetch a sitemap (archived or live) and extract all product URLs."""
        import gzip
        target = sitemap_url
        if "web.archive.org" not in sitemap_url:
            # For live, we might need a direct hit
            target = sitemap_url
            
        log.info(f"   📥 Harvesting: {sitemap_url[-60:]}")
        product_urls = set()
        try:
            async with self.session.get(target, timeout=30) as resp:
                if resp.status == 200:
                    content_bytes = await resp.read()
                    
                    # Handle gzip
                    if content_bytes[:2] == b"\x1f\x8b" or sitemap_url.endswith(".gz"):
                        try:
                            content_bytes = gzip.decompress(content_bytes)
                        except Exception as ge:
                            log.error(f"      Gzip decompression failed for {sitemap_url}: {ge}")
                    
                    content = content_bytes.decode("utf-8", errors="ignore")
                    # Extract <loc> tags
                    locs = re.findall(r"<loc>\s*(https?://[^\s<]+)\s*</loc>", content, re.I)
                    log.info(f"      Found {len(locs)} total links in sitemap.")
                    
                    for loc in locs:
                        if "/products/" in loc or re.search(r"i\d+(?:-s\d+)?\.html", loc):
                            product_urls.add(loc)
                    
                    log.info(f"      Filtered down to {len(product_urls)} product URLs.")
                else:
                    log.error(f"      HTTP Error {resp.status} for {sitemap_url}")
        except Exception as e:
            log.error(f"      Failed to harvest {sitemap_url}: {e}")
        return product_urls

    async def harvest_all(self):
        """Discover sitemaps, extract URLs, and seed the database."""
        sitemaps = await self.discover_archived_sitemaps()
        if not sitemaps:
            # Fallback to current sitemaps if discovery fails
            sitemaps = [
                "https://www.daraz.com.bd/sitemap-product-all.xml",
                "https://www.daraz.com.bd/sitemap-product-all-1.xml.gz"
            ]

        all_discovered = set()
        for s in sitemaps[:50]:
            urls = await self.extract_urls_from_sitemap(s)
            all_discovered.update(urls)
            if len(all_discovered) > 200000:
                break
            
        log.info(f"🎉 Total URLs discovered: {len(all_discovered)}")
        
        # ── Bulk Add to DB (Pending Scrape) ──
        # This part is heavy, we'll implement a fast upsert
        await self.seed_db(all_discovered)

    async def seed_db(self, urls: Set[str]):
        """Efficiently seed products into the database using bulk upsert."""
        from sqlalchemy.dialects.postgresql import insert
        from app.scraper.seed import url_to_ext_id
        
        log.info(f"💾 Preparing to seed {len(urls)} URLs...")
        
        # Prepare data for bulk insert
        to_insert = []
        for url in urls:
            ext_id = url_to_ext_id(url)
            if not ext_id: continue
            
            title = f"[Discovered {datetime.now().strftime('%Y-%m-%d')}]"
            to_insert.append({
                "platform": "daraz",
                "external_id": ext_id,
                "url": url,
                "title": title,
                "normalized_title": title,
                "is_active": True,
                "first_seen_at": datetime.utcnow()
            })

        if not to_insert:
            return

        # Use PostgreSQL ON CONFLICT DO NOTHING for massive speedup
        async with async_session_factory() as db:
            chunk_size = 5000
            for i in range(0, len(to_insert), chunk_size):
                chunk = to_insert[i:i + chunk_size]
                stmt = insert(Product).values(chunk).on_conflict_do_nothing(
                    index_elements=['platform', 'external_id']
                )
                await db.execute(stmt)
                await db.commit()
                log.info(f"   ✅ Seeded chunk: {i + len(chunk)} products total.")

        log.info(f"🎉 Discovery seeding complete. Thousands of leads ready for scraping.")

if __name__ == "__main__":
    harvester = SitemapHarvester()
    async def run():
        async with harvester:
            await harvester.harvest_all()
    asyncio.run(run())
