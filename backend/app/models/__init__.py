"""
DamKoi — SQLAlchemy Models

All models match the PostgreSQL schema defined in PRD Section 8.
Prices are stored as integers in paisa (1 BDT = 100 paisa) to avoid float bugs.
"""

from app.models.product import Product
from app.models.price_snapshot import PriceSnapshot
from app.models.user import User
from app.models.tracked_product import TrackedProduct
from app.models.alert import Alert
from app.models.alert_event import AlertEvent
from app.models.coupon import Coupon
from app.models.match_group import MatchGroup
from app.models.push_subscription import PushSubscription

__all__ = [
    "Product",
    "PriceSnapshot",
    "User",
    "TrackedProduct",
    "Alert",
    "AlertEvent",
    "Coupon",
    "MatchGroup",
    "PushSubscription",
]

