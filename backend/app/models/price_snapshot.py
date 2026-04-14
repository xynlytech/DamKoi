from __future__ import annotations

"""
DamKoi — Price Snapshot Model

Append-only table storing every price observation.
Prices stored as integers in paisa (1 BDT = 100 paisa) to avoid float issues.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, BigInteger, SmallInteger, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    price = Column(Integer, nullable=False)  # in BDT paisa
    original_price = Column(Integer, nullable=True)  # "crossed out" price on page
    discount_pct = Column(SmallInteger, nullable=True)  # as shown by platform
    in_stock = Column(Boolean, default=True)
    scraped_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    product = relationship("Product", back_populates="price_snapshots")

    __table_args__ = (
        Index("idx_price_history", "product_id", scraped_at.desc()),
    )

    def __repr__(self):
        return f"<PriceSnapshot(product_id={self.product_id}, price={self.price}, at={self.scraped_at})>"

    @property
    def price_bdt(self) -> float:
        """Price in BDT (for display)."""
        return self.price / 100.0

    @property
    def original_price_bdt(self) -> float | None:
        """Original price in BDT (for display)."""
        return self.original_price / 100.0 if self.original_price else None
