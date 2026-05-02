import pytest
from app.scraper.utils import extract_daraz_product_id

def test_extract_daraz_product_id():
    # Pattern 1: i{id}-s{sku}.html
    assert extract_daraz_product_id("https://www.daraz.com.bd/products/name-i114982395-s1032884561.html") == "114982395"
    
    # Pattern 1: i{id}.html (No SKU)
    assert extract_daraz_product_id("https://www.daraz.com.bd/products/1-packet-small-flags-tabs-sticky-notes-i133160465.html") == "133160465"
    
    # Pattern 2: ?itemId=
    assert extract_daraz_product_id("https://www.daraz.com.bd/products/something.html?itemId=12345") == "12345"
    
    # Pattern 3: Fallback /i{id}
    assert extract_daraz_product_id("https://www.daraz.com.bd/i54321") == "54321"
    
    # Invalid URL
    assert extract_daraz_product_id("https://google.com") is None
