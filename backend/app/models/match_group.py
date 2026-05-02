"""
DamKoi — Match Group Model

Clusters identical products from different platforms (e.g. Daraz, Cartup)
together so they can be compared side-by-side.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class MatchGroup(Base):
    __tablename__ = "match_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    products = relationship("Product", back_populates="match_group")

    def __repr__(self):
        return f"<MatchGroup(id={self.id}, name='{self.name}')>"
