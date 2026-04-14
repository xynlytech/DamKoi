"""
DamKoi — Sitemap Scraper / Product Seeder

Extracts product URLs from Daraz's sitemap.xml files to seed the database.
Useful for bootstrapping the platform with thousands of URLs.
"""

import asyncio
import gzip
import io
import re
from typing import List, Set

import httpx
from app.scraper.daraz_scraper import DarazScraper

# Daraz BD sitemap index
SITEMAP_INDEX_URL = "https://www.daraz.com.bd/sitemap.xml"


async def fetch_content(url: str, client: httpx.AsyncClient) -> bytes:
    """Fetch content, handling GZIP decompression automatically if needed."""
    try:
        response = await client.get(url, timeout=30.0, follow_redirects=True)
        response.raise_for_status()
        
        content = response.content
        print(f"   📊 [{url[-30:]}] Size: {len(content)} bytes | Status: {response.status_code} | CT: {response.headers.get('Content-Type')}")
        
        # Check if it looks like gzip 
        if content.startswith(b"\x1f\x8b"):
            print(f"   📦 Detected GZIP magic bytes. Decompressing...")
            try:
                return gzip.decompress(content)
            except Exception as e:
                print(f"   ⚠️ Decompression failed: {e}")
        
        return content
    except Exception as e:
        print(f"❌ Failed to fetch: {url} - {e}")
        return b""


def extract_urls(content: bytes) -> List[str]:
    """Extract <loc> values from bytes using a more permissive regex."""
    text = content.decode("utf-8", errors="ignore")
    # Handle possible spaces, newlines or namespaces in the <loc> tag
    loc_pattern = re.compile(r"<loc>\s*(.*?)\s*</loc>", re.IGNORECASE | re.DOTALL)
    urls = loc_pattern.findall(text)
    if not urls:
        # Fallback for even more complex tags
        loc_pattern = re.compile(r"<[a-z0-9:]*loc>\s*(.*?)\s*</[a-z0-9:]*loc>", re.IGNORECASE | re.DOTALL)
        urls = loc_pattern.findall(text)
    
    print(f"   🔎 Found {len(urls)} raw <loc> tags in XML.")
    if urls:
        print(f"   🔍 Sample: {urls[0]}")
    return [u.strip() for u in urls]


async def discover_all_product_sitemaps(client: httpx.AsyncClient) -> List[str]:
    """Recursively find all .xml and .xml.gz sitemaps that likely contain products."""
    to_visit = [SITEMAP_INDEX_URL]
    visited = set()
    product_sitemaps = []

    print(f"🔍 Crawling sitemap index recursively...")

    while to_visit:
        url = to_visit.pop(0)
        if url in visited:
            continue
        visited.add(url)

        print(f"   📑 Checking: {url}")
        content = await fetch_content(url, client)
        if not content:
            continue

        found_urls = extract_urls(content)
        for found in found_urls:
            # If it's a sitemap index/sub-index
            if ".xml" in found and found not in visited:
                if "product" in found.lower():
                    # If it ends in .gz or contains product-all-n, it's likely a leaf
                    if found.endswith(".gz") or re.search(r"product-all-\d+", found):
                        product_sitemaps.append(found)
                    else:
                        to_visit.append(found)
                elif "sitemap.xml" in found: # The main index might point to other branch indexes
                    to_visit.append(found)
                    
    print(f"✅ Discovered {len(product_sitemaps)} leaf product sitemaps.")
    return product_sitemaps


async def extract_product_urls_from_sitemaps(sitemap_urls: List[str], max_urls: int = 2000) -> Set[str]:
    """Extract individual product URLs from a list of sitemap URLs."""
    product_urls = set()
    
    async with httpx.AsyncClient(
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    ) as client:
        for sitemap_url in sitemap_urls:
            if len(product_urls) >= max_urls:
                break
                
            print(f"📥 Processing sitemap: {sitemap_url}")
            content = await fetch_content(sitemap_url, client)
            urls = extract_urls(content)
            
            initial_count = len(product_urls)
            for url in urls:
                # Daraz products in sitemaps often look like:
                # https://www.daraz.com.bd/i114982395-s1032884561.html
                # They consistently use i{product_id}-s{sku_id}.html
                if re.search(r"i\d+-s\d+", url) and ".html" in url:
                    product_urls.add(url)
                    if len(product_urls) >= max_urls:
                        break
            
            print(f"   Collected {len(product_urls) - initial_count} new products. Total: {len(product_urls)}")
            
            # Rate limiting
            await asyncio.sleep(0.5)
            
    return product_urls


async def fetch_content_via_browser(url: str, scraper: DarazScraper) -> bytes:
    """Fetch content using a real browser to pass JS challenges."""
    page = await scraper._context.new_page()
    from playwright_stealth import Stealth
    await Stealth().apply_stealth_async(page)
    
    try:
        print(f"   📑 Browser fetching: {url}")
        # Use longer timeout and wait for network idle to ensure JS challenges pass
        await page.goto(url, wait_until="networkidle", timeout=60000)
        content = await page.content()
        return content.encode("utf-8")
    except Exception as e:
        print(f"❌ Browser fetch failed: {url} - {e}")
        return b""
    finally:
        await page.close()


async def seed_database(max_urls: int = 500):
    """Main seeder entry using browser-level discovery."""
    from app.scraper.daraz_scraper import DarazScraper
    print(f"🌱 Starting Browser-Based Seed Process (Target: {max_urls} URLs)")
    
    async with DarazScraper(headless=True) as scraper:
        # Step 1: Discover sitemaps
        # For efficiency, we'll start directly with the product sitemap index
        # which we know from research
        target_index = "https://www.daraz.com.bd/sitemap-product-all.xml"
        content = await fetch_content_via_browser(target_index, scraper)
        if not content:
            return

        leaf_sitemaps = extract_urls(content)
        leaf_sitemaps = [u for u in leaf_sitemaps if ".xml" in u and "product" in u.lower()]
        
        print(f"✅ Discovered {len(leaf_sitemaps)} potential leaf sitemaps.")
        
        product_urls = set()
        for smap in leaf_sitemaps[:5]: # Just check first few leaves
            if len(product_urls) >= max_urls:
                break
            
            leaf_content = await fetch_content_via_browser(smap, scraper)
            urls = extract_urls(leaf_content)
            
            for url in urls:
                if re.search(r"i\d+-s\d+", url) and ".html" in url:
                    product_urls.add(url)
                    if len(product_urls) >= max_urls:
                        break
                        
            print(f"   Collected {len(product_urls)} products so far...")
    
    print(f"\n🎉 Successfully discovered {len(product_urls)} product URLs!")
    
    with open("seeded_urls.txt", "w") as f:
        for url in product_urls:
            f.write(f"{url}\n")
    
    print(f"📝 Saved to seeded_urls.txt")


if __name__ == "__main__":
    asyncio.run(seed_database())
