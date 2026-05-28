#!/usr/bin/env python3
"""SEO/AEO/GEO regression sweep for damkoi.xynly.com.

Hits every public surface we shipped and asserts the expected SEO signal.
Re-run anytime after a deploy. Pure stdlib, no deps.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request

BASE = "https://damkoi.xynly.com"
SAMPLE_PID = "0000133f-f56b-4ffb-a74b-9a4e63a6ade5"


def fetch(url: str, raw: bool = False):
    req = urllib.request.Request(url, headers={"User-Agent": "DamKoi-SEO-Regression/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        # Case-insensitive header dict — urllib preserves header case which
        # differs across HTTP/1 vs HTTP/2 → normalise once here.
        headers = {k.lower(): v for k, v in r.headers.items()}
        body = r.read()
        if not raw:
            body = body.decode("utf-8", errors="ignore")
        return r.status, headers, body


results: list[tuple[bool, str]] = []


def check(ok: bool, label: str) -> bool:
    results.append((ok, label))
    print(f"  {'✓' if ok else '✗'} {label}")
    return ok


def section(name: str):
    print(f"\n=== {name} ===")


# ── Homepage ────────────────────────────────────────────────────────────────
section("Homepage /en")
s, h, t = fetch(f"{BASE}/en")
check(s == 200, "HTTP 200")
check('rel="canonical" href="https://damkoi.xynly.com/en"' in t, "self-canonical /en")
# Next emits hrefLang attribute (camelCase in JSX → lowercased in HTML but some
# parsers preserve mixed case); match case-insensitively.
check(len(re.findall(r'(?i)hreflang=', t)) >= 3, "en/bn/x-default hreflang links")
check('id="faq-heading"' in t, "FAQ section rendered SSR")
faq_qs = [q for q in re.findall(r"<h3[^>]*>(.*?)</h3>", t, re.S) if "?" in q]
check(len(faq_qs) >= 6, f"6+ FAQ questions ({len(faq_qs)})")
check('"@type":"Organization"' in t and '"knowsAbout"' in t, "Organization schema enriched")
check('"@type":"WebSite"' in t, "WebSite schema present")
check(h.get("cache-control", "").startswith("public"), "homepage cacheable (no-store gone)")
check(h.get("x-content-type-options") == "nosniff", "X-Content-Type-Options")
check(h.get("referrer-policy") == "strict-origin-when-cross-origin", "Referrer-Policy")
check(h.get("x-frame-options") == "SAMEORIGIN", "X-Frame-Options")
check("/en/opengraph-image" in t, "og:image tag present")

# ── OG images ───────────────────────────────────────────────────────────────
section("OG images")
s, h, b = fetch(f"{BASE}/en/opengraph-image", raw=True)
check(
    s == 200 and h.get("content-type", "").startswith("image/png") and len(b) > 10_000,
    f"site OG valid PNG ({len(b)}b)",
)
s, h, b = fetch(f"{BASE}/en/product/{SAMPLE_PID}/opengraph-image", raw=True)
check(
    s == 200 and h.get("content-type", "").startswith("image/png") and len(b) > 10_000,
    f"product OG valid PNG ({len(b)}b)",
)

# ── Product page ────────────────────────────────────────────────────────────
section("Product page")
s, h, t = fetch(f"{BASE}/en/product/{SAMPLE_PID}")
check(s == 200, "HTTP 200")
# Title duplication regression: previously rendered "… | DamKoi | DamKoi".
# The <title> tag itself must contain exactly one " | DamKoi" suffix.
title_match = re.search(r"<title>(.*?)</title>", t)
title = title_match.group(1) if title_match else ""
check(title.count("| DamKoi") == 1, f"title single-suffix ({title[-40:]})")
check('content="noindex' in t, "noindex gate active (thin page)")
check('"@type":"Product"' in t and '"sku"' in t, "Product schema with sku")
check('"@type":"BreadcrumbList"' in t, "BreadcrumbList JSON-LD")
check('aria-label="Breadcrumb"' in t, "visible breadcrumb nav")
check('"x-default"' in t or 'hrefLang="x-default"' in t, "x-default hreflang")

# ── Deals ───────────────────────────────────────────────────────────────────
section("Deals /en/deals")
s, h, t = fetch(f"{BASE}/en/deals")
check(s == 200, "HTTP 200")
check('rel="canonical" href="https://damkoi.xynly.com/en/deals"' in t, "self-canonical")
check(len(re.findall(r"(?i)hreflang=", t)) >= 3, "hreflang links")

# ── Categories index ────────────────────────────────────────────────────────
section("Categories index /en/categories")
s, h, t = fetch(f"{BASE}/en/categories")
check(s == 200, "HTTP 200")
links = set(re.findall(r"/category/[a-z0-9-]+", t))
check(len(links) >= 500, f"500+ category links ({len(links)})")

# ── Category hub ────────────────────────────────────────────────────────────
section("Category hub /en/category/phone-cases")
s, h, t = fetch(f"{BASE}/en/category/phone-cases")
check(s == 200, "HTTP 200")
check("Phone Cases Price in Bangladesh" in t, "H1 correct")
check('"@type":"ItemList"' in t and '"@type":"BreadcrumbList"' in t, "ItemList + Breadcrumb schema")
check(
    len(re.findall(r"/product/[0-9a-f-]{36}", t)) >= 20,
    "20+ product links",
)
check(
    'rel="canonical" href="https://damkoi.xynly.com/en/category/phone-cases"' in t,
    "self-canonical",
)

# ── llms.txt ────────────────────────────────────────────────────────────────
section("/llms.txt")
s, h, t = fetch(f"{BASE}/llms.txt")
check(
    s == 200 and h.get("content-type", "").startswith("text/plain"),
    "200 text/plain",
)
check(t.startswith("# DamKoi"), "real content (not SPA shell)")

# ── robots.txt + sitemaps ───────────────────────────────────────────────────
section("robots.txt + sitemaps")
s, h, t = fetch(f"{BASE}/robots.txt")
check(
    "sitemap-products.xml" in t and "sitemap.xml" in t.lower(),
    "robots lists both sitemaps",
)
s, h, t = fetch(f"{BASE}/sitemap.xml")
cats = len(re.findall(r"/en/category/[a-z0-9-]+", t))
check(s == 200, "sitemap.xml 200")
check(cats >= 500, f"500+ category URLs in sitemap ({cats})")
s, h, t = fetch(f"{BASE}/sitemap-products.xml")
chunks = len(re.findall(r"/product/sitemap/\d+\.xml", t))
check(s == 200 and chunks >= 200, f"product sitemap index ({chunks} chunks)")

# ── APIs ────────────────────────────────────────────────────────────────────
section("APIs")
s, h, t = fetch(f"{BASE}/v1/categories?min=50")
d = json.loads(t)
check(
    s == 200 and len(d.get("categories", [])) >= 500,
    f"/v1/categories ({len(d.get('categories', []))})",
)
s, h, t = fetch(f"{BASE}/v1/products?category=Phone%20Cases&limit=5")
d = json.loads(t)
check(
    s == 200 and len(d.get("products", [])) >= 1,
    f"/v1/products category filter ({len(d.get('products', []))})",
)
s, h, t = fetch(f"{BASE}/v1/products/{SAMPLE_PID}/verdict")
try:
    d = json.loads(t)
    check("tracking_days" in d, "verdict returns tracking_days")
except json.JSONDecodeError:
    check(False, "verdict JSON parse failed")

# ── Summary ─────────────────────────────────────────────────────────────────
passed = sum(1 for ok, _ in results if ok)
total = len(results)
print(f"\n=== TOTAL: {passed}/{total} pass ===")
if passed < total:
    print("\nFAILURES:")
    for ok, label in results:
        if not ok:
            print(f"  ✗ {label}")
    sys.exit(1)
