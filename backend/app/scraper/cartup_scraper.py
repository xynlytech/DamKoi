"""
DamKoi — Cartup Scraper

Cartup is a growing BD electronics + general marketplace.
It's a React SPA — requires Playwright for JS rendering.

URL formats:
  - https://www.cartup.com.bd/products/product-name-slug

Adapter contract:
    CartupScraper — class-based, same interface as DarazScraper
    async def fetch(url: str) -> ScrapedProduct   (convenience wrapper)
"""

import asyncio
import re
import logging
import random
from typing import Optional

from playwright.async_api import async_playwright, Page
from playwright_stealth import Stealth

from app.scraper.base import ScrapedProduct
from app.scraper.daraz_scraper import USER_AGENTS

logger = logging.getLogger(__name__)

TIMEOUT_MS = 30_000
DELAY_MIN = 1.5
DELAY_MAX = 4.0


def _parse_price(text: str) -> Optional[int]:
    """Convert a BDT price string to paisa."""
    if not text:
        return None
    cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
    try:
        return int(float(cleaned) * 100) if cleaned else None
    except (ValueError, TypeError):
        return None


def _extract_external_id(url: str) -> Optional[str]:
    """Extract the product slug from a Cartup product URL."""
    match = re.search(r"/products?/([^/?#]+)", url)
    return match.group(1) if match else None


class CartupScraper:
    """Playwright-based scraper for Cartup.com.bd."""

    def __init__(self, headless: bool = True):
        self.headless = headless
        self._playwright = None
        self._browser = None
        self._context = None

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, *args):
        await self.close()

    async def start(self):
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        self._context = await self._browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1366, "height": 768},
            locale="en-US",
            timezone_id="Asia/Dhaka",
        )

    async def close(self):
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def scrape_product(self, url: str) -> Optional[ScrapedProduct]:
        external_id = _extract_external_id(url)
        if not external_id:
            logger.warning("Cartup: could not extract external_id from %s", url)
            return None

        page = await self._context.new_page()
        stealth = Stealth()
        await stealth.apply_stealth_async(page)

        try:
            await asyncio.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
            await page.goto(url, wait_until="domcontentloaded", timeout=TIMEOUT_MS)

            # Try JSON-LD first (many React stores embed structured data)
            product = await self._extract_from_json_ld(page, url, external_id)
            if not product:
                product = await self._extract_from_dom(page, url, external_id)

            return product

        except Exception as e:
            logger.error("Cartup scrape failed for %s: %s", url, e)
            return None
        finally:
            await page.close()

    async def _extract_from_json_ld(self, page: Page, url: str, external_id: str) -> Optional[ScrapedProduct]:
        """Extract from JSON-LD structured data if present."""
        try:
            data = await page.evaluate("""
                () => {
                    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                    for (const s of scripts) {
                        try {
                            const d = JSON.parse(s.textContent);
                            if (d['@type'] === 'Product') return d;
                        } catch {}
                    }
                    return null;
                }
            """)
            if not data:
                return None

            title = data.get("name")
            if not title:
                return None

            offers = data.get("offers", {})
            if isinstance(offers, list):
                offers = offers[0]

            price_str = str(offers.get("price", "") or "")
            price = _parse_price(price_str)
            if not price:
                return None

            image = data.get("image")
            if isinstance(image, list):
                image = image[0]
            elif isinstance(image, dict):
                image = image.get("url")

            in_stock = "InStock" in str(offers.get("availability", "InStock"))

            return ScrapedProduct(
                external_id=external_id,
                url=url,
                title=title,
                price=price,
                platform="cartup",
                in_stock=in_stock,
                brand=data.get("brand", {}).get("name") if isinstance(data.get("brand"), dict) else data.get("brand"),
                image_url=image,
            )
        except Exception as e:
            logger.debug("Cartup JSON-LD extraction failed: %s", e)
            return None

    async def _extract_from_dom(self, page: Page, url: str, external_id: str) -> Optional[ScrapedProduct]:
        """Fallback DOM extraction for Cartup product pages."""
        try:
            # Wait for product content to load
            try:
                await page.wait_for_selector(
                    ".product-detail, .product-title, h1.product-name, [class*='product']",
                    timeout=8000
                )
            except Exception:
                pass

            title = await _safe_text(page, [
                "h1.product-title",
                "h1.product-name",
                ".product-detail h1",
                "[class*='product-name'] h1",
                "h1",
            ])
            if not title:
                return None

            price_text = await _safe_text(page, [
                ".product-price .price-new",
                ".product-price .special-price",
                "[class*='sell-price']",
                "[class*='current-price']",
                ".price .amount",
            ])
            price = _parse_price(price_text)
            if not price:
                return None

            original_text = await _safe_text(page, [
                ".product-price .price-old",
                "[class*='old-price']",
                "[class*='regular-price']",
                "del.price",
            ])
            original_price = _parse_price(original_text)
            discount_pct = None
            if original_price and original_price > price:
                discount_pct = int(((original_price - price) / original_price) * 100)

            in_stock = True
            oos = await page.query_selector(".out-of-stock, .stock-unavailable, [data-availability='OutOfStock']")
            if oos:
                in_stock = False

            image_url = await page.evaluate("""
                () => {
                    const img = document.querySelector('.product-image img, .product-gallery img, img.product-img');
                    return img ? (img.src || img.dataset.src) : null;
                }
            """)

            category = await _safe_text(page, [".breadcrumb li:last-child a", ".breadcrumb-item:last-child a"])

            return ScrapedProduct(
                external_id=external_id,
                url=url,
                title=title,
                price=price,
                platform="cartup",
                original_price=original_price,
                discount_pct=discount_pct,
                in_stock=in_stock,
                category=category,
                image_url=image_url,
            )
        except Exception as e:
            logger.error("Cartup DOM extraction failed for %s: %s", url, e)
            return None

    async def scrape_batch(self, urls: list[str]) -> list[ScrapedProduct]:
        results = []
        for i, url in enumerate(urls):
            logger.info("Cartup scraping %d/%d: %s", i + 1, len(urls), url[:80])
            product = await self.scrape_product(url)
            if product:
                results.append(product)
        return results


async def _safe_text(page: Page, selectors: list[str]) -> Optional[str]:
    for selector in selectors:
        try:
            el = page.locator(selector).first
            if await el.is_visible(timeout=2000):
                text = await el.text_content()
                if text and text.strip():
                    return text.strip()
        except Exception:
            continue
    return None


async def fetch(url: str) -> Optional[ScrapedProduct]:
    """Convenience wrapper — single URL scrape."""
    async with CartupScraper() as scraper:
        return await scraper.scrape_product(url)
