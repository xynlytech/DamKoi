"""
DamKoi — Othoba Scraper

Scraper for Othoba using Playwright.
URL format: https://www.othoba.com/product-slug
"""

import re
import logging
import asyncio
from typing import Optional
from playwright.async_api import async_playwright

from app.scraper.base import ScrapedProduct

logger = logging.getLogger(__name__)

class OthobaScraper:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def start(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        self.context = await self.browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        )

    async def close(self):
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    def _extract_id(self, url: str) -> Optional[str]:
        # Othoba URLs are mostly just slug based.
        parts = url.strip("/").split("/")
        if parts:
            return parts[-1]
        return None

    def _parse_price(self, text: str) -> Optional[int]:
        if not text:
            return None
        cleaned = re.sub(r"[^\d.]", "", text)
        try:
            return int(float(cleaned) * 100) if cleaned else None
        except (ValueError, TypeError):
            return None

    async def fetch(self, url: str) -> Optional[ScrapedProduct]:
        external_id = self._extract_id(url)
        if not external_id:
            logger.warning(f"Othoba: Could not extract external_id from {url}")
            return None

        page = await self.context.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Wait a bit for React/Vue to hydrate
            await page.wait_for_timeout(2000)

            # --- Title ---
            title = None
            title_el = await page.query_selector("h1.product-name, h1, .product-title")
            if title_el:
                title = (await title_el.inner_text()).strip()

            if not title:
                # Check meta tags
                meta_title = await page.query_selector("meta[property='og:title']")
                if meta_title:
                    title = await meta_title.get_attribute("content")

            if not title:
                logger.warning(f"Othoba: No title found for {url}")
                return None

            # --- Price ---
            price = None
            original_price = None

            # Look for current price
            price_el = await page.query_selector(".product-price span, .price, .special-price .price")
            if price_el:
                price = self._parse_price(await price_el.inner_text())
            
            # If not found, look for JSON-LD
            if not price:
                scripts = await page.query_selector_all("script[type='application/ld+json']")
                for script in scripts:
                    try:
                        import json
                        data = json.loads(await script.inner_text())
                        if data.get("@type") == "Product" and data.get("offers"):
                            price = int(float(data["offers"].get("price", 0)) * 100)
                            break
                    except Exception:
                        continue

            if not price:
                logger.warning(f"Othoba: No price found for {url}")
                return None

            # Look for original price
            mrp_el = await page.query_selector(".old-price .price, del")
            if mrp_el:
                original_price = self._parse_price(await mrp_el.inner_text())

            discount_pct = None
            if original_price and original_price > price:
                discount_pct = int(((original_price - price) / original_price) * 100)

            # --- Image ---
            image_url = None
            img_el = await page.query_selector(".picture img, .product-image img")
            if img_el:
                image_url = await img_el.get_attribute("src")

            if not image_url:
                meta_img = await page.query_selector("meta[property='og:image']")
                if meta_img:
                    image_url = await meta_img.get_attribute("content")

            # --- Stock ---
            in_stock = True
            stock_el = await page.query_selector(".out-of-stock")
            if stock_el:
                in_stock = False

            return ScrapedProduct(
                external_id=external_id,
                url=url,
                title=title,
                price=price,
                platform="othoba",
                original_price=original_price,
                discount_pct=discount_pct,
                in_stock=in_stock,
                category=None,
                brand=None,
                image_url=image_url
            )

        except Exception as e:
            logger.error(f"Othoba scraper failed for {url}: {e}")
            return None
        finally:
            await page.close()

    async def scrape_batch(self, urls: list[str]) -> list[ScrapedProduct]:
        results = []
        for url in urls:
            product = await self.fetch(url)
            if product:
                results.append(product)
            await asyncio.sleep(1)  # Polite delay
        return results
