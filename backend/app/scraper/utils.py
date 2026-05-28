"""
DamKoi — Scraper URL Utilities

URL parsing, platform detection, and product ID extraction
for all supported BD e-commerce platforms.
"""

from typing import Optional, Tuple
from urllib.parse import urlparse
import re


# Exact hostname → platform mapping. Checked against parsed hostname only,
# never against the full URL string, to prevent SSRF via path/query tricks
# like http://evil.com/path?x=daraz.com.bd.
_ALLOWED_HOSTS: dict[str, str] = {
    "daraz.com.bd":     "daraz",
    "www.daraz.com.bd": "daraz",
    "cartup.com.bd":    "cartup",
    "www.cartup.com.bd":"cartup",
    "rokomari.com":     "rokomari",
    "www.rokomari.com": "rokomari",
    "pickaboo.com":     "pickaboo",
    "www.pickaboo.com": "pickaboo",
    "chaldal.com":      "chaldal",
    "www.chaldal.com":  "chaldal",
    "othoba.com":       "othoba",
    "www.othoba.com":   "othoba",
}


def detect_platform_and_id(url: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Detect which BD platform a URL belongs to and extract the external product ID.

    Returns:
        (platform_name, external_id) — e.g. ("daraz", "114982395")
        (None, None) if the URL doesn't match any supported platform.
    """
    if not url:
        return None, None

    try:
        parsed = urlparse(url)
    except Exception:
        return None, None

    # Reject non-HTTP(S) schemes (file://, gopher://, etc.)
    if parsed.scheme not in ("http", "https"):
        return None, None

    hostname = (parsed.hostname or "").lower()
    platform = _ALLOWED_HOSTS.get(hostname)
    if not platform:
        return None, None

    if platform == "daraz":
        return "daraz", extract_daraz_product_id(url)

    if platform == "cartup":
        match = re.search(r"/products?/([^/?#]+)", url)
        return "cartup", match.group(1) if match else None

    if platform == "rokomari":
        match = re.search(r"/(?:book|product)/(\d+)", url)
        return "rokomari", match.group(1) if match else None

    if platform == "pickaboo":
        match = re.search(r"/(?:product|detail)/([^/?#]+)", url)
        return "pickaboo", match.group(1) if match else None

    if platform == "chaldal":
        match = re.search(r"/p/(\d+)", url)
        return "chaldal", match.group(1) if match else None

    if platform == "othoba":
        match = re.search(r"/product/([^/?#]+)", url)
        return "othoba", match.group(1) if match else None

    return None, None


def is_supported_url(url: str) -> bool:
    """Check if a URL belongs to any supported BD platform."""
    platform, _ = detect_platform_and_id(url)
    return platform is not None


def extract_daraz_product_id(url: str) -> Optional[str]:
    """
    Extract product ID from a Daraz BD URL and return the raw numeric ID.

    Supported URL formats:
      - https://www.daraz.com.bd/products/i114982395-s1032884561.html  (product page)
      - https://www.daraz.com.bd/products/some-title-i114982395-s1032884561.html
      - https://www.daraz.com.bd/i114982395-s1032884561.html  (sitemap / short URL)
      - https://www.daraz.com.bd/products/...?itemId=114982395

    Always returns the plain numeric ID (e.g. "114982395") — no "i" prefix.
    """
    if not url:
        return None

    # Pattern 1: i{id} followed by -s{sku} or .html
    match = re.search(r"i(\d+)(?:-s\d+)?\.html", url)
    if match:
        return match.group(1)

    # Pattern 2: ?itemId= query parameter
    match = re.search(r"[?&]itemId=(\d+)", url)
    if match:
        return match.group(1)

    # Pattern 3: Fallback — i{id} anywhere in path preceded by - or /
    match = re.search(r"[-/]i(\d+)(?:[^\d]|$)", url)
    if match:
        return match.group(1)

    return None
