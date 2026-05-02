"""
DamKoi — Product Model

Represents a product listing from an e-commerce platform.
MVP: Daraz only. Phase 2+: Rokomari, Chaldal, etc.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, UniqueConstraint, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    platform = Column(String(50), nullable=False, default="daraz")
    external_id = Column(String(255), nullable=False)
    url = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    normalized_title = Column(Text, nullable=False)
    category = Column(String(255), nullable=True)
    brand = Column(String(255), nullable=True)
    model_number = Column(String(255), nullable=True)
    image_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    first_seen_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_scraped_at = Column(DateTime(timezone=True), nullable=True)
    last_backfilled_at = Column(DateTime(timezone=True), nullable=True)
    match_group_id = Column(UUID(as_uuid=True), ForeignKey("match_groups.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    match_group = relationship("MatchGroup", back_populates="products")
    price_snapshots = relationship("PriceSnapshot", back_populates="product", lazy="selectin")
    tracked_by = relationship("TrackedProduct", back_populates="product", lazy="selectin")
    alerts = relationship("Alert", back_populates="product", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("platform", "external_id", name="uq_product_platform_external_id"),
    )

    def __repr__(self):
        return f"<Product(id={self.id}, title='{self.title[:40]}...', platform='{self.platform}')>"
