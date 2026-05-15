"""
DamKoi — Daraz Category Harvester

Scrapes Daraz category listing pages via HTTP and extracts FULL product data
(price, title, image, stock) from __NEXT_DATA__ in one pass.

Technique: each listing page embeds __NEXT_DATA__ with 30-40 products including
current prices — same approach used by top-ranked Daraz scrapers on Apify.

55 categories × 5 pages = 275 HTTP requests → ~9,000 products with live prices.
vs old approach: 275 requests for URLs only, then 9,000 more for individual prices.

Falls back to URL-only seeding if __NEXT_DATA__ parsing yields nothing.
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

# Search keyword URLs — same __NEXT_DATA__ structure as category pages.
# Popular BD search terms that return high-volume product listings.
BD_SEARCH_KEYWORDS = [
    "smartphone", "laptop", "headphone", "speaker", "smartwatch",
    "t-shirt", "saree", "shoes", "bag", "wallet",
    "rice cooker", "blender", "electric-fan", "iron",
    "face wash", "shampoo", "moisturizer",
    "cricket bat", "football", "exercise mat",
    "baby diaper", "baby formula",
    "motor oil", "helmet",
]

BD_SEARCH_URLS = [
    f"catalog/?q={kw.replace(' ', '+')}&" for kw in BD_SEARCH_KEYWORDS
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
    """
    Scrape Daraz category listing pages and extract full product data
    (price, title, image) from __NEXT_DATA__ — one request per page,
    ~35 products per page with live prices.
    """

    BASE = "https://www.daraz.com.bd/"

    def __init__(self, max_pages_per_cat: int = 5, concurrency: int = 8):
        self.max_pages = max_pages_per_cat
        self.concurrency = concurrency

    async def _scrape_category(
        self,
        client: httpx.AsyncClient,
        slug: str,
        sem: asyncio.Semaphore,
    ) -> tuple[list, Set[str]]:
        """
        Fetch up to max_pages pages for one category.
        Returns (scraped_products_with_prices, fallback_url_set).
        """
        from app.scraper.daraz_http import scrape_listing_page

        products = []
        fallback_urls: Set[str] = set()

        for page in range(1, self.max_pages + 1):
            page_url = f"{self.BASE}{slug}" + (f"?page={page}" if page > 1 else "")
            page_products = await scrape_listing_page(client, page_url, sem)

            if page_products:
                products.extend(page_products)
            else:
                # Fallback: extract URLs from raw HTML for stub seeding
                async with sem:
                    await asyncio.sleep(random.uniform(0.5, 1.5))
                    try:
                        headers = {**_HEADERS, "User-Agent": random.choice(USER_AGENTS)}
                        resp = await client.get(page_url, headers=headers, follow_redirects=True)
                        if resp.status_code == 200:
                            fallback_urls.update(_PRODUCT_URL_RE.findall(resp.text))
                        else:
                            break
                    except Exception:
                        break

            # Stop early if last page returned nothing (end of results)
            if not page_products and not fallback_urls:
                break

        return products, fallback_urls

    async def harvest_all(self) -> int:
        all_slugs = BD_CATEGORIES + BD_SEARCH_URLS
        log.info("CategoryHarvester: scanning %d slugs (%d categories + %d searches, %d pages each)...",
                 len(all_slugs), len(BD_CATEGORIES), len(BD_SEARCH_URLS), self.max_pages)
        sem = asyncio.Semaphore(self.concurrency)

        try:
            import h2  # noqa: F401
            kw = {"timeout": 25, "http2": True}
        except ImportError:
            kw = {"timeout": 25}

        async with httpx.AsyncClient(**kw) as client:
            results = await asyncio.gather(
                *[self._scrape_category(client, slug, sem) for slug in all_slugs]
            )

        all_products = []
        all_fallback_urls: Set[str] = set()
        for prods, urls in results:
            all_products.extend(prods)
            all_fallback_urls.update(urls)

        # De-duplicate by external_id (keep first occurrence — latest category page)
        seen: Set[str] = set()
        unique_products = []
        for p in all_products:
            if p.external_id not in seen:
                seen.add(p.external_id)
                unique_products.append(p)

        log.info(
            "CategoryHarvester: %d unique products with prices; %d fallback URLs",
            len(unique_products), len(all_fallback_urls),
        )

        saved = 0

        # Save products with prices (the main path)
        if unique_products:
            from app.scraper.tasks import ScrapeAgent
            agent = ScrapeAgent(batch_name="CategoryHarvest", platform="daraz")
            await agent._save_results(unique_products)
            saved += len(unique_products)
            log.info("CategoryHarvester: saved %d products with prices", len(unique_products))

        # Seed any remaining stubs from fallback URL extraction
        fallback_new = all_fallback_urls - {p.url for p in unique_products}
        if fallback_new:
            stub_count = await self._seed_stubs(fallback_new)
            saved += stub_count
            log.info("CategoryHarvester: seeded %d stub URLs (no price yet)", stub_count)

        return saved

    async def _seed_stubs(self, urls: Set[str]) -> int:
        """Seed URL-only stubs for products where __NEXT_DATA__ parsing failed."""
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

        return seeded
