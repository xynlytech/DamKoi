"""
DamKoi — Chaldal Scraper

Chaldal is BD's largest online grocery. It's a React SPA.
We use httpx and BeautifulSoup to parse JSON-LD or initial state.
"""

import re
import json
import logging
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from app.scraper.base import ScrapedProduct

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
}

TIMEOUT = httpx.Timeout(20.0, connect=10.0)


def _extract_external_id(url: str) -> Optional[str]:
    """Extract product ID from Chaldal URL (e.g. /p/12345 or /product-name)"""
    match = re.search(r"/(?:p|product)/(\d+)", url)
    if match:
        return match.group(1)
    
    # Sometimes it's just the slug, e.g. chaldal.com/ruhi-fish
    parts = url.strip("/").split("/")
    if parts:
        return parts[-1]
    return None


async def fetch(url: str) -> Optional[ScrapedProduct]:
    """Scrape a single Chaldal product using JSON-LD or meta tags."""
    external_id = _extract_external_id(url)
    if not external_id:
        return None

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
    except Exception as e:
        logger.error(f"Chaldal request error for {url}: {e}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    title = None
    price = None
    original_price = None
    image_url = None
    in_stock = True
    category = None

    # Try JSON-LD
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
            if isinstance(data, list):
                data = data[0]
            if data.get("@type") == "Product":
                title = data.get("name")
                image_url = data.get("image")
                if isinstance(image_url, list):
                    image_url = image_url[0]
                
                offers = data.get("offers")
                if offers:
                    if isinstance(offers, list):
                        offers = offers[0]
                    price_str = offers.get("price")
                    if price_str:
                        price = int(float(price_str) * 100)
                    
                    availability = offers.get("availability", "")
                    if "OutOfStock" in availability:
                        in_stock = False
        except Exception:
            pass

    # Fallback to OpenGraph / Meta tags
    if not title:
        og_title = soup.find("meta", property="og:title")
        if og_title:
            title = og_title.get("content")

    if not image_url:
        og_image = soup.find("meta", property="og:image")
        if og_image:
            image_url = og_image.get("content")

    if not price:
        # Fallback to DOM elements if server renders anything
        price_el = soup.select_one(".price, .product-price")
        if price_el:
            cleaned = re.sub(r"[^\d.]", "", price_el.get_text())
            if cleaned:
                price = int(float(cleaned) * 100)

    if not title or not price:
        logger.warning(f"Chaldal: Failed to parse title or price for {url}")
        return None

    discount_pct = None
    if original_price and original_price > price:
        discount_pct = int(((original_price - price) / original_price) * 100)

    return ScrapedProduct(
        external_id=external_id,
        url=url,
        title=title,
        price=price,
        platform="chaldal",
        original_price=original_price,
        discount_pct=discount_pct,
        in_stock=in_stock,
        category=category,
        brand=None,
        image_url=image_url,
    )


async def fetch_batch(urls: list[str]) -> list[ScrapedProduct]:
    """Scrape multiple Chaldal URLs."""
    import asyncio
    results = []
    for url in urls:
        product = await fetch(url)
        if product:
            results.append(product)
        await asyncio.sleep(1.0)
    return results
