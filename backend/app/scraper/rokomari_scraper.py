"""
DamKoi — Rokomari Scraper

Rokomari is Bangladesh's largest book/media e-commerce platform.
It runs on server-rendered PHP — no JavaScript rendering needed.
We use httpx for fast, lightweight scraping.

URL formats:
  - https://www.rokomari.com/book/123456/book-title
  - https://www.rokomari.com/book/123456

Adapter contract:
    async def fetch(url: str) -> ScrapedProduct
"""

import re
import logging
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from app.scraper.base import ScrapedProduct

logger = logging.getLogger(__name__)

# Rokomari request headers — mimic a real browser
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Referer": "https://www.rokomari.com/",
}

TIMEOUT = httpx.Timeout(20.0, connect=10.0)


def _parse_price(text: str) -> Optional[int]:
    """Convert a BDT price string to paisa. E.g. 'TK. 350' -> 35000"""
    if not text:
        return None
    cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
    try:
        return int(float(cleaned) * 100) if cleaned else None
    except (ValueError, TypeError):
        return None


def _extract_external_id(url: str) -> Optional[str]:
    """Extract numeric book/product ID from Rokomari URL."""
    match = re.search(r"/(?:book|product)/(\d+)", url)
    return match.group(1) if match else None


async def fetch(url: str) -> Optional[ScrapedProduct]:
    """
    Scrape a single Rokomari product page.
    Returns ScrapedProduct or None on failure.
    """
    external_id = _extract_external_id(url)
    if not external_id:
        logger.warning("Rokomari: could not extract external_id from %s", url)
        return None

    try:
        async with httpx.AsyncClient(
            headers=HEADERS,
            timeout=TIMEOUT,
            follow_redirects=True,
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        logger.error("Rokomari HTTP error %s for %s", e.response.status_code, url)
        return None
    except httpx.RequestError as e:
        logger.error("Rokomari request error for %s: %s", url, e)
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    # ── Title ──────────────────────────────────────────────────
    title = None
    title_el = (
        soup.select_one("h1.details-book-info__book-name")
        or soup.select_one("h1.book-details-name")
        or soup.select_one(".book-info h1")
        or soup.select_one("h1")
    )
    if title_el:
        title = title_el.get_text(strip=True)

    if not title:
        logger.warning("Rokomari: no title found at %s", url)
        return None

    # ── Price ──────────────────────────────────────────────────
    price = None
    original_price = None

    # Current (discounted) price
    price_el = (
        soup.select_one(".details-book-info__price-new")
        or soup.select_one(".book-info__mrp span")
        or soup.select_one(".sell-price")
        or soup.select_one("span.sell-price")
    )
    if price_el:
        price = _parse_price(price_el.get_text(strip=True))

    # MRP / original price (crossed out)
    mrp_el = (
        soup.select_one(".details-book-info__price-old")
        or soup.select_one(".book-info__mrp del")
        or soup.select_one("del.mrp")
    )
    if mrp_el:
        original_price = _parse_price(mrp_el.get_text(strip=True))

    if not price:
        logger.warning("Rokomari: no price found at %s", url)
        return None

    # ── Discount % ─────────────────────────────────────────────
    discount_pct = None
    if original_price and original_price > price:
        discount_pct = int(((original_price - price) / original_price) * 100)

    # ── Stock ──────────────────────────────────────────────────
    in_stock = True
    out_stock_el = soup.select_one(".out-of-stock, .stock-out, [data-stock='0']")
    if out_stock_el:
        in_stock = False

    # ── Category ───────────────────────────────────────────────
    category = None
    cat_el = soup.select_one(".breadcrumb li:last-child a, .breadcrumb-item:last-child a")
    if cat_el:
        category = cat_el.get_text(strip=True)

    # ── Brand / Author (for books = author is the "brand") ─────
    brand = None
    author_el = (
        soup.select_one(".details-book-info__author a")
        or soup.select_one(".book-info__author a")
        or soup.select_one("a.author-name")
    )
    if author_el:
        brand = author_el.get_text(strip=True)

    # ── Image ──────────────────────────────────────────────────
    image_url = None
    img_el = (
        soup.select_one(".details-book-info__img img")
        or soup.select_one(".book-details-img img")
        or soup.select_one("img.book-img")
    )
    if img_el:
        image_url = img_el.get("src") or img_el.get("data-src")
        if image_url and image_url.startswith("//"):
            image_url = "https:" + image_url

    return ScrapedProduct(
        external_id=external_id,
        url=url,
        title=title,
        price=price,
        platform="rokomari",
        original_price=original_price,
        discount_pct=discount_pct,
        in_stock=in_stock,
        category=category,
        brand=brand,
        image_url=image_url,
    )


async def fetch_batch(urls: list[str]) -> list[ScrapedProduct]:
    """Scrape multiple Rokomari URLs. httpx is fast — no browser overhead."""
    import asyncio
    results = []
    for url in urls:
        product = await fetch(url)
        if product:
            results.append(product)
        await asyncio.sleep(1.0)  # polite delay: 1 req/s
    return results
