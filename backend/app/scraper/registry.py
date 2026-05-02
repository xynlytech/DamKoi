"""
DamKoi — Platform Registry

Single source of truth for all supported BD e-commerce platforms.
Each platform entry defines its URL patterns, scraper module reference,
and whether it's currently enabled via feature flags.

Adding a new platform:
  1. Create `backend/app/scraper/<platform>_scraper.py` with async `fetch(url) -> ScrapedProduct`
  2. Add an entry to PLATFORMS below
  3. Add the platform name to ENABLED_PLATFORMS env var
  4. Run the 50-SKU QA test suite
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional, Callable


@dataclass
class PlatformConfig:
    """Configuration for a single BD e-commerce platform."""
    name: str                          # lowercase slug: 'daraz', 'cartup', etc.
    display_name: str                  # human-readable: 'Daraz', 'Cartup'
    base_urls: List[str]               # e.g. ['www.daraz.com.bd']
    url_patterns: List[str]            # regex patterns for product URLs
    scraper_module: str                # dotted path: 'app.scraper.daraz_scraper'
    scraper_class: Optional[str] = None  # class name if class-based (e.g. 'DarazScraper')
    requires_playwright: bool = True   # False for server-rendered sites (httpx)
    wayback_supported: bool = True     # Whether archive.org has coverage
    content_script_matches: List[str] = field(default_factory=list)  # Chrome extension matchers
    extract_id_pattern: Optional[str] = None  # regex to extract external_id from URL

    def matches_url(self, url: str) -> bool:
        """Check if a URL belongs to this platform."""
        for pattern in self.url_patterns:
            if re.search(pattern, url):
                return True
        return False

    def extract_external_id(self, url: str) -> Optional[str]:
        """Extract the platform-specific external ID from a product URL."""
        if self.extract_id_pattern:
            match = re.search(self.extract_id_pattern, url)
            if match:
                return match.group(1)
        return None


# ── Platform Definitions ──────────────────────────────────────

PLATFORMS = {
    "daraz": PlatformConfig(
        name="daraz",
        display_name="Daraz",
        base_urls=["www.daraz.com.bd"],
        url_patterns=[
            r"daraz\.com\.bd/products/",
            r"daraz\.com\.bd/.*-i\d+-s\d+\.html",
            r"daraz\.com\.bd/i\d+-s\d+\.html",
        ],
        scraper_module="app.scraper.daraz_scraper",
        scraper_class="DarazScraper",
        requires_playwright=True,
        wayback_supported=True,
        content_script_matches=[
            "*://www.daraz.com.bd/products/*",
            "*://www.daraz.com.bd/*-i*-s*.html",
            "*://www.daraz.com.bd/i*-s*.html",
        ],
        extract_id_pattern=r"i(\d+)(?:-s\d+)?\.html",
    ),
    "cartup": PlatformConfig(
        name="cartup",
        display_name="Cartup",
        base_urls=["www.cartup.com.bd", "cartup.com.bd"],
        url_patterns=[
            r"cartup\.com\.bd/products?/",
            r"cartup\.com\.bd/.+",
        ],
        scraper_module="app.scraper.cartup_scraper",
        scraper_class="CartupScraper",
        requires_playwright=True,
        wayback_supported=True,
        content_script_matches=[
            "*://www.cartup.com.bd/products/*",
            "*://cartup.com.bd/products/*",
        ],
        extract_id_pattern=r"/products?/([^/?#]+)",
    ),
    "rokomari": PlatformConfig(
        name="rokomari",
        display_name="Rokomari",
        base_urls=["www.rokomari.com", "rokomari.com"],
        url_patterns=[
            r"rokomari\.com/book/",
            r"rokomari\.com/product/",
        ],
        scraper_module="app.scraper.rokomari_scraper",
        scraper_class=None,  # function-based: async def fetch(url)
        requires_playwright=False,  # server-rendered PHP
        wayback_supported=True,
        content_script_matches=[
            "*://www.rokomari.com/book/*",
            "*://rokomari.com/book/*",
        ],
        extract_id_pattern=r"/(?:book|product)/(\d+)",
    ),
    "pickaboo": PlatformConfig(
        name="pickaboo",
        display_name="Pickaboo",
        base_urls=["www.pickaboo.com", "pickaboo.com"],
        url_patterns=[
            r"pickaboo\.com/product/",
            r"pickaboo\.com/detail/",
        ],
        scraper_module="app.scraper.pickaboo_scraper",
        scraper_class="PickabooScraper",
        requires_playwright=True,
        wayback_supported=True,
        content_script_matches=[
            "*://www.pickaboo.com/product/*",
            "*://pickaboo.com/product/*",
        ],
        extract_id_pattern=r"/(?:product|detail)/([^/?#]+)",
    ),
    "chaldal": PlatformConfig(
        name="chaldal",
        display_name="Chaldal",
        base_urls=["chaldal.com", "www.chaldal.com"],
        url_patterns=[
            r"chaldal\.com/.+",
        ],
        scraper_module="app.scraper.chaldal_scraper",
        scraper_class=None,  # function-based (internal API)
        requires_playwright=False,  # uses internal JSON API
        wayback_supported=False,
        content_script_matches=[
            "*://chaldal.com/*",
            "*://www.chaldal.com/*",
        ],
        extract_id_pattern=r"/p/(\d+)",
    ),
    "othoba": PlatformConfig(
        name="othoba",
        display_name="Othoba",
        base_urls=["www.othoba.com", "othoba.com"],
        url_patterns=[
            r"othoba\.com/.+",
        ],
        scraper_module="app.scraper.othoba_scraper",
        scraper_class="OthobaScraper",
        requires_playwright=True,
        wayback_supported=False,
        content_script_matches=[
            "*://www.othoba.com/*",
            "*://othoba.com/*",
        ],
        extract_id_pattern=r"/product/([^/?#]+)",
    ),
}


def get_platform(name: str) -> Optional[PlatformConfig]:
    """Get platform config by name."""
    return PLATFORMS.get(name.lower())


def detect_platform(url: str) -> Optional[PlatformConfig]:
    """Detect which platform a URL belongs to."""
    for config in PLATFORMS.values():
        if config.matches_url(url):
            return config
    return None


def get_enabled_platforms() -> list[PlatformConfig]:
    """Return only platforms that are enabled via feature flags."""
    from app.services.flags import is_platform_enabled
    return [p for p in PLATFORMS.values() if is_platform_enabled(p.name)]


def get_all_platform_names() -> list[str]:
    """Return all registered platform names."""
    return list(PLATFORMS.keys())
