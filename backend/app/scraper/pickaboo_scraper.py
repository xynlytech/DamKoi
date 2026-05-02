"""
DamKoi — Pickaboo Scraper

Pickaboo is a BD electronics marketplace (phones, laptops, appliances).
It's a React SPA — requires Playwright for rendering.

URL formats:
  - https://www.pickaboo.com/product/product-slug
  - https://www.pickaboo.com/detail/product-id

Adapter contract:
    PickabooScraper — class-based, same interface as CartupScraper
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
DELAY_MIN = 2.0
DELAY_MAX = 5.0


def _parse_price(text: str) -> Optional[int]:
    if not text:
        return None
    cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
    try:
        return int(float(cleaned) * 100) if cleaned else None
    except (ValueError, TypeError):
        return None


def _extract_external_id(url: str) -> Optional[str]:
    match = re.search(r"/(?:product|detail)/([^/?#]+)", url)
    return match.group(1) if match else None


class PickabooScraper:
    """Playwright-based scraper for Pickaboo.com."""

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
            logger.warning("Pickaboo: could not extract external_id from %s", url)
            return None

        page = await self._context.new_page()
        stealth = Stealth()
        await stealth.apply_stealth_async(page)

        try:
            await asyncio.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
            await page.goto(url, wait_until="domcontentloaded", timeout=TIMEOUT_MS)

            # Pickaboo uses JSON-LD for product data
            product = await self._extract_from_json_ld(page, url, external_id)
            if not product:
                product = await self._extract_from_dom(page, url, external_id)

            return product

        except Exception as e:
            logger.error("Pickaboo scrape failed for %s: %s", url, e)
            return None
        finally:
            await page.close()

    async def _extract_from_json_ld(self, page: Page, url: str, external_id: str) -> Optional[ScrapedProduct]:
        try:
            data = await page.evaluate("""
                () => {
                    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                    for (const s of scripts) {
                        try {
                            const d = JSON.parse(s.textContent);
                            if (d['@type'] === 'Product') return d;
                            if (Array.isArray(d['@graph'])) {
                                const p = d['@graph'].find(x => x['@type'] === 'Product');
                                if (p) return p;
                            }
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

            price = _parse_price(str(offers.get("price", "") or ""))
            if not price:
                return None

            image = data.get("image")
            if isinstance(image, list):
                image = image[0]
            elif isinstance(image, dict):
                image = image.get("url")

            in_stock = "InStock" in str(offers.get("availability", "InStock"))

            brand = None
            if isinstance(data.get("brand"), dict):
                brand = data["brand"].get("name")
            elif isinstance(data.get("brand"), str):
                brand = data["brand"]

            return ScrapedProduct(
                external_id=external_id,
                url=url,
                title=title,
                price=price,
                platform="pickaboo",
                in_stock=in_stock,
                brand=brand,
                image_url=image if isinstance(image, str) else None,
            )
        except Exception as e:
            logger.debug("Pickaboo JSON-LD extraction failed: %s", e)
            return None

    async def _extract_from_dom(self, page: Page, url: str, external_id: str) -> Optional[ScrapedProduct]:
        try:
            try:
                await page.wait_for_selector(
                    "h1, .product-name, [class*='product-title']",
                    timeout=8000
                )
            except Exception:
                pass

            title = await _safe_text(page, [
                "h1.product-name",
                "h1.product-title",
                ".product-details h1",
                "[class*='product-name']",
                "h1",
            ])
            if not title:
                return None

            price_text = await _safe_text(page, [
                ".price-box .price",
                ".product-price .final-price",
                "[class*='selling-price']",
                "[class*='special-price']",
                ".product-price",
            ])
            price = _parse_price(price_text)
            if not price:
                return None

            original_text = await _safe_text(page, [
                ".price-box .old-price",
                "[class*='original-price']",
                "[class*='regular-price']",
                "del.price, s.price",
            ])
            original_price = _parse_price(original_text)
            discount_pct = None
            if original_price and original_price > price:
                discount_pct = int(((original_price - price) / original_price) * 100)

            in_stock = True
            oos = await page.query_selector("[class*='out-of-stock'], [data-availability='OutOfStock']")
            if oos:
                in_stock = False

            image_url = await page.evaluate("""
                () => {
                    const img = document.querySelector(
                        '.product-image-main img, .gallery-main img, .product-img img'
                    );
                    return img ? (img.src || img.dataset.src) : null;
                }
            """)

            category = await _safe_text(page, [".breadcrumb li:last-child a"])
            brand = await _safe_text(page, ["[class*='brand-name'] a", ".product-brand a"])

            return ScrapedProduct(
                external_id=external_id,
                url=url,
                title=title,
                price=price,
                platform="pickaboo",
                original_price=original_price,
                discount_pct=discount_pct,
                in_stock=in_stock,
                category=category,
                brand=brand,
                image_url=image_url,
            )
        except Exception as e:
            logger.error("Pickaboo DOM extraction failed for %s: %s", url, e)
            return None

    async def scrape_batch(self, urls: list[str]) -> list[ScrapedProduct]:
        results = []
        for i, url in enumerate(urls):
            logger.info("Pickaboo scraping %d/%d: %s", i + 1, len(urls), url[:80])
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
    async with PickabooScraper() as scraper:
        return await scraper.scrape_product(url)
