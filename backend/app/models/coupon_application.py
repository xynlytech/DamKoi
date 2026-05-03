"""SQLAlchemy model for coupon auto-apply telemetry."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CouponApplication(Base):
    __tablename__ = "coupon_applications"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True, index=True)
    anon_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    coupon_code: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cart_total: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    savings: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
