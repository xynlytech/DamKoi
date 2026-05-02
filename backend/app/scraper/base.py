"""
DamKoi — Shared Scraper Base Types

Platform-agnostic data model for scraped product data.
Every per-platform scraper (Daraz, Cartup, Rokomari, Pickaboo, Chaldal, Othoba)
returns a ScrapedProduct instance. The rest of the pipeline — verdict engine,
alert engine, alternatives, coupons — is platform-agnostic and consumes this type.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class ScrapedProduct:
    """Raw scraped product data from any BD e-commerce platform."""
    external_id: str
    url: str
    title: str
    price: int  # in BDT paisa (1 BDT = 100 paisa)
    platform: str = "daraz"  # platform identifier
    original_price: Optional[int] = None  # "crossed out" price, in paisa
    discount_pct: Optional[int] = None
    in_stock: bool = True
    category: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    image_url: Optional[str] = None
    scraped_at: datetime = field(default_factory=datetime.utcnow)
    raw_data: Optional[dict] = None  # full extraction payload for debugging
