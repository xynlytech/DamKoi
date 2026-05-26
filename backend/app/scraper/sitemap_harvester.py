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

    async def _fetch_locs(self, sitemap_url: str) -> List[str]:
        """Fetch a sitemap (handling gzip) and return all <loc> values."""
        import gzip
        log.info(f"   📥 Fetching: {sitemap_url[-70:]}")
        try:
            async with self.session.get(sitemap_url, timeout=45) as resp:
                if resp.status != 200:
                    log.error(f"      HTTP {resp.status} for {sitemap_url}")
                    return []
                content_bytes = await resp.read()
                # Only decompress if it's actually raw gzip (aiohttp already
                # handles transport-level Content-Encoding: gzip).
                if content_bytes[:2] == b"\x1f\x8b":
                    try:
                        content_bytes = gzip.decompress(content_bytes)
                    except Exception as ge:
                        log.error(f"      Gzip decompress failed {sitemap_url}: {ge}")
                content = content_bytes.decode("utf-8", errors="ignore")
                return re.findall(r"<loc>\s*(https?://[^\s<]+)\s*</loc>", content, re.I)
        except Exception as e:
            log.error(f"      Failed to fetch {sitemap_url}: {e}")
            return []

    @staticmethod
    def _is_product_url(loc: str) -> bool:
        return "/products/" in loc or bool(re.search(r"i\d+(?:-s\d+)?\.html", loc))

    async def extract_urls_from_sitemap(self, sitemap_url: str) -> Set[str]:
        """Fetch a leaf sitemap and return its product URLs."""
        locs = await self._fetch_locs(sitemap_url)
        product_urls = {loc for loc in locs if self._is_product_url(loc)}
        log.info(f"      {len(product_urls)}/{len(locs)} product URLs.")
        return product_urls

    async def harvest_all(self):
        """
        Walk the Daraz product sitemap index → all gzipped sub-sitemaps →
        product URLs, then bulk-seed. Capped by HARVEST_MAX_URLS so we stay
        within the free-tier DB size (default 50k).
        """
        import os
        max_urls = int(os.environ.get("HARVEST_MAX_URLS", "50000"))
        index_url = "https://www.daraz.com.bd/sitemap-product-all.xml"

        # The product index lists sub-sitemaps (sitemap-product-all-N.xml[.gz]).
        index_locs = await self._fetch_locs(index_url)
        sub_sitemaps = [u for u in index_locs if "sitemap-product-all-" in u]
        if not sub_sitemaps:
            # index_url was itself a leaf (or layout changed) — treat as leaf
            sub_sitemaps = [index_url]
        log.info(f"📑 Product index: {len(sub_sitemaps)} sub-sitemaps (cap {max_urls} URLs).")

        all_discovered: Set[str] = set()
        for i, s in enumerate(sub_sitemaps, 1):
            all_discovered.update(await self.extract_urls_from_sitemap(s))
            log.info(f"   running total: {len(all_discovered)} URLs ({i}/{len(sub_sitemaps)} sub-sitemaps)")
            if len(all_discovered) >= max_urls:
                break

        log.info(f"🎉 Total URLs discovered: {len(all_discovered)}")
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
            # Postgres caps bind params at 32767; 7 cols/row → keep chunk < 4681.
            chunk_size = 4000
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
