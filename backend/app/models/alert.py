"""
DamKoi — Alert Model

Users set a target price; DamKoi notifies them when reached.
Free tier: 3 active alerts per user. Premium: unlimited.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    target_price = Column(Integer, nullable=False)  # in BDT paisa
    notify_via = Column(ARRAY(String(50)), default=["email"])  # ['email', 'whatsapp', 'push']
    is_active = Column(Boolean, default=True)
    last_triggered = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="alerts")
    product = relationship("Product", back_populates="alerts")
    events = relationship("AlertEvent", back_populates="alert", lazy="selectin")

    def __repr__(self):
        return f"<Alert(user={self.user_id}, product={self.product_id}, target={self.target_price})>"

    @property
    def target_price_bdt(self) -> float:
        """Target price in BDT (for display)."""
        return self.target_price / 100.0
