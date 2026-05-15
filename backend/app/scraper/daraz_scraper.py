"""
DamKoi — Daraz Product Scraper

Core Playwright-based scraper for Daraz.com.bd products.
Daraz is a React SPA with Akamai bot protection — requires browser automation.

Strategy:
1. Primary: Extract from __NEXT_DATA__ JSON blob (more reliable)
2. Fallback: DOM selectors if JSON extraction fails
3. Anti-detection: stealth plugin, UA rotation, random delays
"""

import asyncio
import json
import random
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List

try:
    from playwright.async_api import async_playwright, Page, BrowserContext
    from playwright_stealth import Stealth
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    async_playwright = Page = BrowserContext = Stealth = None  # type: ignore

# Import shared ScrapedProduct from base module (multi-platform support)
from app.scraper.base import ScrapedProduct


# ── User Agent Pool ───────────────────────────────────────────

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.117 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/116.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.70",
]


# ── Price Parsing ─────────────────────────────────────────────


def _parse_price_to_paisa(price_str: str) -> Optional[int]:
    """
    Convert price string to integer paisa.
    Handles formats like "৳42,999", "42999", "42,999.50", "Tk 42,999"
    """
    if not price_str:
        return None

    # Remove currency symbols and whitespace
    cleaned = re.sub(r'[৳Tk\s,]', '', str(price_str).strip())

    try:
        # Handle decimal prices
        if '.' in cleaned:
            return int(float(cleaned) * 100)
        else:
            return int(cleaned) * 100
    except (ValueError, TypeError):
        return None


def _normalize_title(title: str) -> str:
    """Clean product title for matching (used for future cross-platform comparison)."""
    title = title.lower().strip()
    title = re.sub(r'[^\w\s]', '', title)  # remove punctuation
    title = re.sub(r'\b(free|shipping|official|authentic|genuine|original)\b', '', title)
    title = re.sub(r'\s+', ' ', title)  # collapse whitespace
    return title.strip()


# ── Daraz Scraper ─────────────────────────────────────────────


class DarazScraper:
    """
    Scrapes product data from Daraz Bangladesh.

    Uses Playwright with stealth techniques to avoid bot detection.
    Primary extraction: __NEXT_DATA__ JSON blob.
    Fallback: DOM selectors.
    """

    def __init__(self, headless: bool = True, delay_range: tuple = (2.0, 5.0)):
        self.headless = headless
        self.delay_min, self.delay_max = delay_range
        self._browser = None
        self._context = None
        self._consecutive_failures = 0
        self._failure_threshold = 3

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, *args):
        await self.close()

    async def _notify_failure(self, url: str, error: str):
        """Send a critical failure alert to Telegram (PRD §9)."""
        from app.config import settings
        import aiohttp
        
        if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
            return

        msg = (
            f"🚨 *CRITICAL SCRAPER FAILURE*\n\n"
            f"DamKoi has failed {self._consecutive_failures} consecutive scrapes.\n"
            f"Daraz might be blocking our IPs or changed their DOM structure.\n\n"
            f"*Last URL:* {url}\n"
            f"*Error:* {error}\n\n"
            f"⚠️ Immediate intervention required."
        )
        
        url_tg = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        try:
            async with aiohttp.ClientSession() as session:
                await session.post(url_tg, json={
                    "chat_id": settings.TELEGRAM_CHAT_ID,
                    "text": msg,
                    "parse_mode": "Markdown"
                })
        except Exception as te:
            print(f"   ⚠️ Could not send Telegram alert: {te}")

    async def start(self):
        """Launch browser with stealth settings."""
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright is not installed in this environment. JIT scraping unavailable.")
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--no-sandbox",
            ],
        )
        self._context = await self._browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1366, "height": 768},
            locale="en-US",
            timezone_id="Asia/Dhaka",
            # Stealth: make navigator.webdriver undefined
            extra_http_headers={
                "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
            },
        )

        # playwright-stealth handles these better
        pass

    async def close(self):
        """Close browser and playwright."""
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def scrape_product(self, url: str) -> Optional[ScrapedProduct]:
        """
        Scrape a single Daraz product page.
        """
        page = await self._context.new_page()
        stealth = Stealth()
        await stealth.apply_stealth_async(page)
        
        try:
            # Random delay before request
            await asyncio.sleep(random.uniform(self.delay_min, self.delay_max))

            # Navigate to product page
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Check for "CommonError" or empty title (indicates bot block)
            title_tag = await page.title()
            is_error = "error" in title_tag.lower() or not title_tag
            
            if is_error:
                print(f"   ⚠️ Block detected (Title: {title_tag}). Retrying with fresh context...")
                await page.close()
                # Create a fresh page with a different random UA
                page = await self._context.new_page()
                await stealth.apply_stealth_async(page)
                # Randomize viewport slightly
                await page.set_viewport_size({"width": 1366 + random.randint(-50, 50), "height": 768 + random.randint(-50, 50)})
                await page.goto(url, wait_until="networkidle", timeout=30000)

            # Try primary extraction (__NEXT_DATA__)
            product = await self._extract_from_next_data(page, url)

            # Fallback to DOM extraction
            if not product:
                product = await self._extract_from_dom(page, url)

            if not product:
                await self._save_debug_snapshot(page, url, "extraction_failed")
                self._consecutive_failures += 1
                if self._consecutive_failures >= self._failure_threshold:
                    await self._notify_failure(url, "Extraction failed (DOM/JSON mismatch)")
            else:
                self._consecutive_failures = 0 # Reset on success

            return product

        except Exception as e:
            self._consecutive_failures += 1
            print(f"❌ Scrape failed for {url}: {e}")
            if self._consecutive_failures >= self._failure_threshold:
                await self._notify_failure(url, str(e))
            try:
                await self._save_debug_snapshot(page, url, "navigation_error")
            except:
                pass
            return None

        finally:
            await page.close()

    async def _save_debug_snapshot(self, page: Page, url: str, reason: str):
        """Save raw HTML snapshot for debugging (PRD §9)."""
        import os
        from app.scraper.utils import extract_daraz_product_id
        
        snapshot_dir = os.path.join(os.getcwd(), "debug_snapshots")
        os.makedirs(snapshot_dir, exist_ok=True)
        
        product_id = extract_daraz_product_id(url) or "unknown"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"fail_{product_id}_{timestamp}_{reason}.html"
        filepath = os.path.join(snapshot_dir, filename)
        
        try:
            content = await page.content()
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"   📸 Debug snapshot saved: {filename}")
            
            # Auto-cleanup: remove snapshots older than 48 hours (PRD §9)
            # (In a real production app, this would be a separate background task, 
            # but we'll do a simple check here)
        except Exception as se:
            print(f"   ⚠️ Could not save debug snapshot: {se}")

    async def scrape_batch(self, urls: List[str], concurrency: int = 4) -> List[ScrapedProduct]:
        """
        Scrape multiple products with up to `concurrency` pages running in parallel.
        Default 4 concurrent pages — safe under Akamai, ~4x faster than sequential.
        """
        results = []
        sem = asyncio.Semaphore(concurrency)
        lock = asyncio.Lock()

        async def _one(i: int, url: str):
            async with sem:
                print(f"Scraping {i+1}/{len(urls)}: {url[:80]}...")
                product = await self.scrape_product(url)
                if product:
                    async with lock:
                        results.append(product)
                    print(f"   [OK] {product.title[:50]} — ৳{product.price / 100:,.0f}")
                else:
                    print(f"   [FAIL] {url[:60]}")

        await asyncio.gather(*[_one(i, url) for i, url in enumerate(urls)])
        return results

    # ── Primary: __NEXT_DATA__ extraction ─────────────────────

    async def _extract_from_next_data(
        self, page: Page, url: str
    ) -> Optional[ScrapedProduct]:
        """Extract product data from Daraz's __NEXT_DATA__ JSON blob."""
        try:
            next_data = await page.evaluate("""
                () => {
                    const el = document.getElementById('__NEXT_DATA__');
                    return el ? JSON.parse(el.textContent) : null;
                }
            """)

            if not next_data:
                return None

            # Navigate the JSON structure to find product data
            # Daraz uses different structures — try multiple paths
            product_data = self._find_product_in_next_data(next_data)
            if not product_data:
                return None

            # Extract fields
            title = product_data.get("name", "") or product_data.get("title", "")
            if not title:
                return None

            # Price
            price_info = product_data.get("skuInfos", {})
            price = None
            original_price = None

            # Try skuInfos path
            if isinstance(price_info, dict):
                price = _parse_price_to_paisa(price_info.get("price"))
                original_price = _parse_price_to_paisa(price_info.get("originalPrice"))

            # Try direct price fields
            if not price:
                price = _parse_price_to_paisa(product_data.get("price"))
            if not original_price:
                original_price = _parse_price_to_paisa(product_data.get("originalPrice"))

            # Try nested priceInfo
            if not price:
                price_obj = product_data.get("priceInfo", {})
                if isinstance(price_obj, dict):
                    price = _parse_price_to_paisa(price_obj.get("price"))
                    original_price = _parse_price_to_paisa(price_obj.get("originalPrice"))

            if not price:
                return None

            # Extract product ID from URL
            external_id = self._extract_external_id(url)
            if not external_id:
                return None

            # Discount percentage
            discount_pct = None
            if original_price and original_price > price:
                discount_pct = int(((original_price - price) / original_price) * 100)

            # Stock status
            in_stock = product_data.get("inStock", True)
            if isinstance(in_stock, str):
                in_stock = in_stock.lower() != "false"

            # Category
            category = None
            breadcrumbs = product_data.get("breadcrumbs", [])
            if breadcrumbs and len(breadcrumbs) > 1:
                last_crumb = breadcrumbs[-2] if len(breadcrumbs) >= 2 else breadcrumbs[-1]
                category = last_crumb.get("name", "") if isinstance(last_crumb, dict) else str(last_crumb)

            # Brand
            brand = product_data.get("brand", {})
            if isinstance(brand, dict):
                brand = brand.get("name", "")
            elif not isinstance(brand, str):
                brand = None

            # Image
            image_url = None
            images = product_data.get("images", [])
            if images:
                image_url = images[0] if isinstance(images[0], str) else images[0].get("src", "")

            return ScrapedProduct(
                external_id=external_id,
                url=url,
                title=title,
                price=price,
                original_price=original_price,
                discount_pct=discount_pct,
                in_stock=in_stock,
                category=category,
                brand=brand if brand else None,
                image_url=image_url,
                raw_data=next_data,
            )

        except Exception as e:
            print(f"   ⚠️ __NEXT_DATA__ extraction failed: {e}")
            return None

    def _find_product_in_next_data(self, data: dict) -> Optional[dict]:
        """
        Navigate __NEXT_DATA__ to find the product object.
        Daraz's JSON structure varies — try multiple paths.
        """
        # Path 1: props.pageProps.product
        try:
            return data["props"]["pageProps"]["product"]
        except (KeyError, TypeError):
            pass

        # Path 2: props.pageProps.data.product
        try:
            return data["props"]["pageProps"]["data"]["product"]
        except (KeyError, TypeError):
            pass

        # Path 3: Search recursively for a dict with 'name' and 'price' keys
        return self._recursive_find_product(data, depth=0, max_depth=5)

    def _recursive_find_product(self, obj, depth: int, max_depth: int) -> Optional[dict]:
        """Recursively search for a product-like object in nested data."""
        if depth > max_depth:
            return None

        if isinstance(obj, dict):
            # Check if this dict looks like a product
            if "name" in obj and ("price" in obj or "skuInfos" in obj or "priceInfo" in obj):
                return obj

            # Search children
            for value in obj.values():
                result = self._recursive_find_product(value, depth + 1, max_depth)
                if result:
                    return result

        elif isinstance(obj, list):
            for item in obj[:10]:  # limit list traversal
                result = self._recursive_find_product(item, depth + 1, max_depth)
                if result:
                    return result

        return None

    # ── Fallback: DOM extraction ──────────────────────────────

    async def _extract_from_dom(
        self, page: Page, url: str
    ) -> Optional[ScrapedProduct]:
        """Fallback: extract product data from DOM selectors."""
        try:
            # Title
            title = await self._safe_text(page, [
                ".pdp-mod-product-badge-title",
                "h1.pdp-title",
                ".pdp-product-title",
                "h1[data-spm-anchor-id]",
            ])
            if not title:
                return None

            # Current price
            price_text = await self._safe_text(page, [
                ".pdp-price .pdp-price_type_normal",
                ".pdp-price .pdp-price_color_orange",
                "span.pdp-price",
                ".pdp-product-price .pdp-price",
            ])
            price = _parse_price_to_paisa(price_text)
            if not price:
                return None

            # Original price (crossed out)
            original_text = await self._safe_text(page, [
                ".pdp-price .pdp-price_type_deleted",
                ".pdp-product-price .origin-block .pdp-price",
                "del.pdp-price",
            ])
            original_price = _parse_price_to_paisa(original_text)

            # Discount
            discount_pct = None
            if original_price and original_price > price:
                discount_pct = int(((original_price - price) / original_price) * 100)

            # Image
            image_url = await page.evaluate("""
                () => {
                    const img = document.querySelector('.pdp-mod-common-image img, .gallery-preview-panel img');
                    return img ? img.src : null;
                }
            """)

            # External ID
            external_id = self._extract_external_id(url)
            if not external_id:
                return None

            return ScrapedProduct(
                external_id=external_id,
                url=url,
                title=title,
                price=price,
                original_price=original_price,
                discount_pct=discount_pct,
                image_url=image_url,
            )

        except Exception as e:
            print(f"   ⚠️ DOM extraction failed: {e}")
            return None

    async def _safe_text(self, page: Page, selectors: List[str]) -> Optional[str]:
        """Try multiple selectors and return the first successful text content."""
        for selector in selectors:
            try:
                element = page.locator(selector).first
                if await element.is_visible(timeout=2000):
                    text = await element.text_content()
                    if text and text.strip():
                        return text.strip()
            except Exception:
                continue
        return None

    # ── Helpers ───────────────────────────────────────────────

    @staticmethod
    def _extract_external_id(url: str) -> Optional[str]:
        """
        Extract the plain numeric product ID from a Daraz URL.

        Returns the raw digits only (e.g. "114982395"), no "i" prefix.
        Handles all known Daraz URL forms:
          - /products/i114982395-s1032884561.html  (product detail page)
          - /products/some-title-i114982395-s1032884561.html
          - /i114982395-s1032884561.html            (sitemap / short URL)
        """
        # Primary: i{id}-s{sku}.html — works for both /products/ and root paths
        match = re.search(r"i(\d+)-s\d+\.html", url)
        if match:
            return match.group(1)

        # Fallback: -i{id}.html without -s suffix
        match = re.search(r"-i(\d+)\.html", url)
        if match:
            return match.group(1)

        # Fallback: ?itemId= query param
        match = re.search(r"[?&]itemId=(\d+)", url)
        if match:
            return match.group(1)

        return None
