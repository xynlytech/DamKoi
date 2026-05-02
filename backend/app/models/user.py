"""
DamKoi — User Model

Supports both anonymous (anon_id via browser fingerprint) and authenticated users.
Auth handled by Supabase (free: 50K MAU).
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=True)
    phone = Column(String(20), nullable=True)
    anon_id = Column(String(255), unique=True, nullable=True)  # browser fingerprint
    auth_provider = Column(String(50), nullable=True)  # 'email', 'google', 'facebook'
    is_premium = Column(Boolean, default=False)
    premium_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    tracked_products = relationship("TrackedProduct", back_populates="user", lazy="selectin")
    alerts = relationship("Alert", back_populates="user", lazy="selectin")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', anon_id='{self.anon_id}')>"
