"""
DamKoi — Tracked Product Model

Maps users (or anonymous sessions) to products they're watching.
No login required for tracking — uses anon_id from browser localStorage.
"""

from datetime import datetime
from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class TrackedProduct(Base):
    __tablename__ = "tracked_products"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    anon_id = Column(String(255), nullable=True)  # for pre-login tracking
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="tracked_products")
    product = relationship("Product", back_populates="tracked_by")

    def __repr__(self):
        return f"<TrackedProduct(user={self.user_id or self.anon_id}, product={self.product_id})>"
