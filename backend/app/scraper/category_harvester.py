"""
DamKoi — Daraz Category Harvester

Discovers product URLs by scraping Daraz BD category listing pages via HTTP.
No Playwright needed. Each page yields 30-40 product URLs.
50 categories × 5 pages = ~7,500 fresh product URLs per daily harvest run.
"""

import asyncio
import logging
import random
import re
from typing import List, Set

import httpx

from app.database import async_session_factory
from app.models.product import Product
from app.scraper.daraz_scraper import USER_AGENTS

log = logging.getLogger("damkoi.category_harvester")

BD_CATEGORIES = [
    # Electronics
    "mobile-phones/",
    "laptops/",
    "tablets/",
    "televisions/",
    "monitors/",
    "cameras/",
    "headphones/",
    "speakers/",
    "smart-watches/",
    "power-banks/",
    "chargers-cables/",
    "hard-drives-storage/",
    "networking-devices/",
    "keyboards-mice/",
    "printers-scanners/",
    "projectors/",
    # Home Appliances
    "refrigerators/",
    "washing-machines/",
    "air-conditioners/",
    "microwave-ovens/",
    "electric-fans/",
    "electric-irons/",
    "vacuum-cleaners/",
    "water-heaters/",
    "kitchen-appliances/",
    # Fashion
    "mens-clothing/",
    "womens-clothing/",
    "mens-shoes/",
    "womens-shoes/",
    "mens-bags/",
    "womens-bags/",
    "sunglasses/",
    "watches/",
    "jewelry/",
    # Home & Living
    "furniture/",
    "bedding-bath/",
    "home-decor/",
    "kitchen-dining/",
    "tools-home-improvement/",
    # Sports
    "sports-fitness/",
    "bicycles/",
    "outdoor-recreation/",
    # Beauty & Health
    "skin-care/",
    "hair-care/",
    "health-monitors/",
    "vitamins-supplements/",
    # Baby & Toys
    "toys-games/",
    "baby-care/",
    # Automotive
    "car-accessories/",
    "motorbike-accessories/",
    # Books & Stationery
    "books/",
    "stationery/",
]

_PRODUCT_URL_RE = re.compile(
    r'(https?://www\.daraz\.com\.bd/products/[^\s"\'<>]*i\d+-s\d+\.html)',
    re.IGNORECASE,
)

_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Referer": "https://www.daraz.com.bd/",
}


class CategoryHarvester:
    """Harvest Daraz product URLs from category listing pages (HTTP only)."""

    BASE = "https://www.daraz.com.bd/"

    def __init__(self, max_pages_per_cat: int = 5, concurrency: int = 5):
        self.max_pages = max_pages_per_cat
        self.concurrency = concurrency

    async def _fetch_page(
        self, client: httpx.AsyncClient, url: str, sem: asyncio.Semaphore
    ) -> Set[str]:
        async with sem:
            await asyncio.sleep(random.uniform(0.5, 1.5))
            try:
                headers = {**_HEADERS, "User-Agent": random.choice(USER_AGENTS)}
                resp = await client.get(url, headers=headers, follow_redirects=True)
                if resp.status_code != 200:
                    return set()
                found = set(_PRODUCT_URL_RE.findall(resp.text))
                log.debug("  %s → %d products", url, len(found))
                return found
            except Exception as e:
                log.debug("Fetch error %s: %s", url, e)
                return set()

    async def _harvest_category(
        self, client: httpx.AsyncClient, slug: str, sem: asyncio.Semaphore
    ) -> Set[str]:
        urls: Set[str] = set()
        for page in range(1, self.max_pages + 1):
            page_url = f"{self.BASE}{slug}" + (f"?page={page}" if page > 1 else "")
            found = await self._fetch_page(client, page_url, sem)
            if not found:
                break
            urls.update(found)
        return urls

    async def harvest_all(self) -> int:
        log.info("CategoryHarvester: scanning %d categories...", len(BD_CATEGORIES))
        sem = asyncio.Semaphore(self.concurrency)

        try:
            import h2  # noqa: F401
            kw = {"timeout": 20, "http2": True}
        except ImportError:
            kw = {"timeout": 20}

        async with httpx.AsyncClient(**kw) as client:
            results = await asyncio.gather(
                *[self._harvest_category(client, slug, sem) for slug in BD_CATEGORIES]
            )

        all_urls: Set[str] = set()
        for r in results:
            all_urls.update(r)

        log.info("CategoryHarvester: found %d unique product URLs", len(all_urls))
        if not all_urls:
            return 0

        return await self._seed_db(all_urls)

    async def _seed_db(self, urls: Set[str]) -> int:
        from datetime import datetime
        from sqlalchemy.dialects.postgresql import insert

        to_insert = []
        for url in urls:
            m = re.search(r"i(\d+)-s\d+\.html", url)
            if not m:
                continue
            to_insert.append({
                "platform": "daraz",
                "external_id": m.group(1),
                "url": url,
                "title": "[Discovered]",
                "is_active": True,
            })

        if not to_insert:
            return 0

        seeded = 0
        async with async_session_factory() as db:
            for i in range(0, len(to_insert), 2000):
                chunk = to_insert[i : i + 2000]
                stmt = (
                    insert(Product)
                    .values(chunk)
                    .on_conflict_do_nothing(index_elements=["platform", "external_id"])
                )
                result = await db.execute(stmt)
                seeded += result.rowcount or 0
                await db.commit()

        log.info("CategoryHarvester: seeded %d new products into DB", seeded)
        return seeded
