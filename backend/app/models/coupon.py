"""
DamKoi — Coupon Model

Stores platform-wide and product-specific discount codes for Daraz.
Coupons are refreshed every 2 hours by the background scheduler.
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # product_id is NULL for platform-wide coupons; set for product-specific ones
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True, index=True)

    code = Column(String(100), nullable=False)
    source = Column(String(50), default="daraz_page")  # 'daraz_page' | 'platform' | 'seller'

    # Discount — at least one of these must be set
    discount_pct  = Column(Integer, nullable=True)   # e.g. 10 means 10% off
    discount_flat = Column(Integer, nullable=True)   # paisa, e.g. 5000 = ৳50 off

    min_spend = Column(Integer, nullable=True)        # paisa — minimum cart value to apply
    max_uses  = Column(Integer, nullable=True)        # null = unlimited

    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    product = relationship("Product", backref="coupons")

    # Indexes
    __table_args__ = (
        Index("idx_coupons_product_active", "product_id", "is_active"),
        Index("idx_coupons_code", "code"),
    )

    def __repr__(self):
        return f"<Coupon(code={self.code}, discount_pct={self.discount_pct}, flat={self.discount_flat})>"

    @property
    def display_discount(self) -> str:
        """Human-readable discount string."""
        if self.discount_pct:
            return f"{self.discount_pct}% off"
        if self.discount_flat:
            return f"৳{self.discount_flat // 100} off"
        return "Discount"

    @property
    def min_spend_bdt(self) -> Optional[float]:
        return self.min_spend / 100.0 if self.min_spend else None
