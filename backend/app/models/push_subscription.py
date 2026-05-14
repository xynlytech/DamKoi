"""
DamKoi — Push Subscription Model

Stores Web Push subscriptions keyed by email address.
Anonymous users subscribe after setting a price alert; the email links
the subscription to future alert triggers.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Email links this subscription to price alerts
    email = Column(String(255), nullable=False, index=True)

    # Full JSON from PushSubscription.toJSON() — endpoint + keys
    subscription_json = Column(Text, nullable=False)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_push_sub_email_active", "email", "is_active"),
    )

    def __repr__(self):
        return f"<PushSubscription(email={self.email}, active={self.is_active})>"
