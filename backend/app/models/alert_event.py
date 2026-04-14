"""
DamKoi — Alert Event Model

Notification log — tracks every alert notification sent.
Used for debugging, analytics, and enforcing the 24h rate limit.
"""

from datetime import datetime
from sqlalchemy import Column, BigInteger, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    alert_id = Column(UUID(as_uuid=True), ForeignKey("alerts.id"), nullable=False)
    price_at_trigger = Column(Integer, nullable=False)  # in BDT paisa
    channel = Column(String(50), nullable=True)
    sent_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    success = Column(Boolean, default=True)

    # Relationships
    alert = relationship("Alert", back_populates="events")

    def __repr__(self):
        return f"<AlertEvent(alert={self.alert_id}, price={self.price_at_trigger}, success={self.success})>"
