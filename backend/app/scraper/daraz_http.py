"""
DamKoi — Daraz HTTP Scraper

Plain httpx-based price fetching — extracts __NEXT_DATA__ from SSR HTML.
~20x faster than Playwright because there is no browser overhead.

Used as the primary fast path when the Daraz Affiliate API is not configured.
Falls back gracefully to Playwright if Akamai blocks the requests (yield < 10%).
"""

import asyncio
import json
import logging
import random
import re
from typing import Optional, List

import httpx

from app.scraper.base import ScrapedProduct
from app.scraper.daraz_scraper import USER_AGENTS, _parse_price_to_paisa

logger = logging.getLogger(__name__)

_NEXT_DATA_RE = re.compile(
    r'<script\s+id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE,
)

_EXT_ID_RE = re.compile(r"i(\d+)(?:-s\d+)?\.html")

_HEADERS_BASE = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Referer": "https://www.daraz.com.bd/",
    "sec-ch-ua": '"Chromium";v="131", "Not A(Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
}


def _find_product(data: dict) -> Optional[dict]:
    """Walk known __NEXT_DATA__ paths to find the product object."""
    try:
        return data["props"]["pageProps"]["product"]
    except (KeyError, TypeError):
        pass
    try:
        return data["props"]["pageProps"]["data"]["product"]
    except (KeyError, TypeError):
        pass

    def _search(obj, depth=0):
        if depth > 5:
            return None
        if isinstance(obj, dict):
            if "name" in obj and ("price" in obj or "skuInfos" in obj or "priceInfo" in obj):
                return obj
            for v in obj.values():
                r = _search(v, depth + 1)
                if r:
                    return r
        elif isinstance(obj, list):
            for item in obj[:10]:
                r = _search(item, depth + 1)
                if r:
                    return r
        return None

    return _search(data)


def _parse_product(url: str, data: dict) -> Optional[ScrapedProduct]:
    """Map __NEXT_DATA__ dict to ScrapedProduct."""
    prod = _find_product(data)
    if not prod:
        return None

    title = prod.get("name") or prod.get("title") or ""
    if not title:
        return None

    price: Optional[int] = None
    original_price: Optional[int] = None

    sku = prod.get("skuInfos", {})
    if isinstance(sku, dict):
        price = _parse_price_to_paisa(sku.get("price"))
        original_price = _parse_price_to_paisa(sku.get("originalPrice"))

    if not price:
        price = _parse_price_to_paisa(prod.get("price"))
    if not original_price:
        original_price = _parse_price_to_paisa(prod.get("originalPrice"))

    if not price:
        pi = prod.get("priceInfo", {})
        if isinstance(pi, dict):
            price = _parse_price_to_paisa(pi.get("price"))
            original_price = _parse_price_to_paisa(pi.get("originalPrice"))

    if not price:
        return None

    m = _EXT_ID_RE.search(url)
    if not m:
        return None
    external_id = m.group(1)

    discount_pct = None
    if original_price and original_price > price:
        discount_pct = int((original_price - price) / original_price * 100)

    in_stock = prod.get("inStock", True)
    if isinstance(in_stock, str):
        in_stock = in_stock.lower() != "false"

    category = None
    crumbs = prod.get("breadcrumbs", [])
    if len(crumbs) >= 2:
        last = crumbs[-2]
        category = last.get("name") if isinstance(last, dict) else str(last)

    brand = prod.get("brand", {})
    if isinstance(brand, dict):
        brand = brand.get("name")
    elif not isinstance(brand, str):
        brand = None

    images = prod.get("images", [])
    image_url = None
    if images:
        image_url = images[0] if isinstance(images[0], str) else images[0].get("src")

    return ScrapedProduct(
        external_id=external_id,
        url=url,
        title=title,
        price=price,
        original_price=original_price,
        discount_pct=discount_pct,
        in_stock=bool(in_stock),
        category=category,
        brand=brand or None,
        image_url=image_url,
        platform="daraz",
    )


async def _fetch_one(
    client: httpx.AsyncClient,
    url: str,
    sem: asyncio.Semaphore,
) -> Optional[ScrapedProduct]:
    async with sem:
        await asyncio.sleep(random.uniform(0.3, 1.0))
        try:
            headers = {**_HEADERS_BASE, "User-Agent": random.choice(USER_AGENTS)}
            resp = await client.get(url, headers=headers, follow_redirects=True)
            if resp.status_code in (403, 429, 503):
                return None
            if resp.status_code != 200:
                return None
            m = _NEXT_DATA_RE.search(resp.text)
            if not m:
                return None
            data = json.loads(m.group(1))
            return _parse_product(url, data)
        except Exception as e:
            logger.debug("HTTP fetch failed %s: %s", url, e)
            return None


async def scrape_batch_http(
    urls: List[str],
    concurrency: int = 20,
) -> List[ScrapedProduct]:
    """
    Fetch prices for many Daraz product pages via plain HTTP.
    Returns empty list if Akamai is blocking (success rate < 10%).
    """
    if not urls:
        return []

    sem = asyncio.Semaphore(concurrency)
    results: List[ScrapedProduct] = []

    # Use HTTP/2 if h2 package is available, plain HTTP/1.1 otherwise
    try:
        import h2  # noqa: F401
        client_kwargs = {"timeout": 15, "http2": True}
    except ImportError:
        client_kwargs = {"timeout": 15}

    async with httpx.AsyncClient(**client_kwargs) as client:
        responses = await asyncio.gather(
            *[_fetch_one(client, url, sem) for url in urls]
        )

    results = [r for r in responses if r is not None]
    rate = len(results) / len(urls) if urls else 0
    logger.info(
        "HTTP scrape: %d/%d products (%.0f%% success rate)",
        len(results), len(urls), rate * 100,
    )
    return results
