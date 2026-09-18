"""Daraz leaves operation.disable false on sold-out SKUs; the real signal is
quantity.limit.max == 0 ("Out of stock"). Payloads trimmed from live mtop
responses captured 2026-09-18."""
from app.scraper.daraz_http import _parse_module_data_product, _product_from_mtop_module

URL = "https://www.daraz.com.bd/i446486668-s2137558996.html"


def _sku(max_qty, text=None):
    quantity = {"limit": {"max": max_qty, "min": 0 if max_qty == 0 else 1}, "type": "default"}
    if text:
        quantity.update(text=text, type="warning")
    return {
        "price": {"salePrice": {"text": "৳ 2,151", "value": 2151}},
        "operation": {"disable": False},
        "quantity": quantity,
    }


SOLD_OUT = _sku(0, "Out of stock")
AVAILABLE = _sku(15)


def _mtop_module(sku):
    return {
        "product": {"title": "Hairpin female Korean version rhinestone hair clip"},
        "tracking": {},
        "skuInfos": {"2137558996": sku},
    }


def _ssr_module_data(sku):
    return {
        "data": {
            "root": {
                "fields": {
                    "tracking": {"pdt_name": "Hairpin female Korean version rhinestone hair clip"},
                    "primaryKey": {"itemId": "446486668", "skuId": "2137558996"},
                    "skuInfos": {"2137558996": {**sku, "salePrice": "2151"}},
                }
            }
        }
    }


def test_mtop_sold_out_sku_is_out_of_stock():
    product = _product_from_mtop_module(URL, _mtop_module(SOLD_OUT), "446486668", "2137558996")
    assert product.in_stock is False


def test_mtop_available_sku_is_in_stock():
    product = _product_from_mtop_module(URL, _mtop_module(AVAILABLE), "446486668", "2137558996")
    assert product.in_stock is True


def test_mtop_sku_without_quantity_defaults_to_in_stock():
    sku = {k: v for k, v in AVAILABLE.items() if k != "quantity"}
    product = _product_from_mtop_module(URL, _mtop_module(sku), "446486668", "2137558996")
    assert product.in_stock is True


def test_ssr_sold_out_sku_is_out_of_stock():
    product = _parse_module_data_product(URL, _ssr_module_data(SOLD_OUT))
    assert product.in_stock is False


def test_ssr_available_sku_is_in_stock():
    product = _parse_module_data_product(URL, _ssr_module_data(AVAILABLE))
    assert product.in_stock is True
