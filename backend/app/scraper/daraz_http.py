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


def _find_listing_items(data: dict) -> list[dict]:
    """
    Walk known __NEXT_DATA__ paths to find the product list on a category/
    search listing page. Returns the raw item list (may be empty).
    """
    # Path 1: most common — mods.listItems
    try:
        items = data["props"]["pageProps"]["mods"]["listItems"]
        if isinstance(items, list) and items:
            return items
    except (KeyError, TypeError):
        pass
    # Path 2: data.modules.listItems
    try:
        items = data["props"]["pageProps"]["data"]["modules"]["listItems"]
        if isinstance(items, list) and items:
            return items
    except (KeyError, TypeError):
        pass
    # Path 3: initialProps variant
    try:
        items = data["props"]["initialProps"]["mods"]["listItems"]
        if isinstance(items, list) and items:
            return items
    except (KeyError, TypeError):
        pass
    # Path 4: deep search for any list that looks like product items
    def _deep(obj, depth=0):
        if depth > 6 or not isinstance(obj, (dict, list)):
            return []
        if isinstance(obj, list) and len(obj) >= 3:
            if all(isinstance(x, dict) and ("itemId" in x or "nid" in x or "name" in x) for x in obj[:3]):
                return obj
        if isinstance(obj, dict):
            for v in obj.values():
                r = _deep(v, depth + 1)
                if r:
                    return r
        return []

    return _deep(data)


def _parse_listing_item(item: dict) -> Optional["ScrapedProduct"]:
    """Convert a single listing-page item dict to ScrapedProduct."""
    from app.scraper.daraz_scraper import _parse_price_to_paisa

    # External ID — itemId, nid, or from URL
    ext_id = str(item.get("itemId") or item.get("nid") or "").strip()

    # Try extracting from productUrl if id not present
    item_url = item.get("itemUrl") or item.get("productUrl") or ""
    if not ext_id:
        m = _EXT_ID_RE.search(item_url)
        ext_id = m.group(1) if m else ""
    if not ext_id:
        return None

    # Full URL
    if item_url.startswith("//"):
        item_url = "https:" + item_url
    elif item_url.startswith("/"):
        item_url = "https://www.daraz.com.bd" + item_url
    elif not item_url.startswith("http"):
        item_url = f"https://www.daraz.com.bd/products/i{ext_id}.html"

    # Title
    title = (item.get("name") or item.get("title") or "").strip()
    if not title:
        return None

    # Price — listing pages store prices as strings like "1,299" or ints
    price = _parse_price_to_paisa(item.get("price")) or _parse_price_to_paisa(item.get("currentPrice"))
    if not price:
        return None
    original_price = _parse_price_to_paisa(item.get("originalPrice")) or _parse_price_to_paisa(item.get("beforePrice"))

    discount_pct = None
    if original_price and original_price > price:
        discount_pct = int((original_price - price) / original_price * 100)

    # Stock
    in_stock_raw = item.get("inStock", item.get("stock", True))
    if isinstance(in_stock_raw, str):
        in_stock = in_stock_raw.lower() not in ("false", "0", "out_of_stock", "outofstock")
    else:
        in_stock = bool(in_stock_raw)

    # Image
    image_url = item.get("image") or item.get("imageUrl") or item.get("img") or ""
    if image_url.startswith("//"):
        image_url = "https:" + image_url
    if not image_url.startswith("http"):
        image_url = None

    brand = item.get("brandName") or item.get("brand") or None
    if isinstance(brand, dict):
        brand = brand.get("name")
    category = item.get("categoryName") or item.get("category") or None

    return ScrapedProduct(
        external_id=ext_id,
        url=item_url,
        title=title,
        price=price,
        original_price=original_price,
        discount_pct=discount_pct,
        in_stock=in_stock,
        category=category,
        brand=brand or None,
        image_url=image_url,
        platform="daraz",
    )


async def scrape_listing_page(
    client: httpx.AsyncClient,
    url: str,
    sem: asyncio.Semaphore,
) -> list[ScrapedProduct]:
    """
    Fetch a Daraz category/search listing page and extract ALL product prices
    from __NEXT_DATA__. One page ≈ 30-40 products. Returns empty list on failure.
    """
    async with sem:
        await asyncio.sleep(random.uniform(0.5, 1.5))
        try:
            headers = {**_HEADERS_BASE, "User-Agent": random.choice(USER_AGENTS)}
            resp = await client.get(url, headers=headers, follow_redirects=True)
            if resp.status_code != 200:
                logger.debug("Listing page %s → HTTP %s", url, resp.status_code)
                return []
            m = _NEXT_DATA_RE.search(resp.text)
            if not m:
                logger.debug("Listing page %s → no __NEXT_DATA__", url)
                return []
            data = json.loads(m.group(1))
            items = _find_listing_items(data)
            products = [_parse_listing_item(i) for i in items]
            return [p for p in products if p is not None]
        except Exception as exc:
            logger.debug("Listing page fetch error %s: %s", url, exc)
            return []


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
