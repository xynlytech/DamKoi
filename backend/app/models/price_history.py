from __future__ import annotations

"""
DamKoi — Compact Price History

One row per product holding the entire price timeline as a JSONB series:
    series = [[epoch_day, price_paisa], ...]   # sorted ascending by day

A new point is appended only when the price changes (dedupe), so unchanged
periods cost nothing. This keeps the whole catalog's history in ~hundreds of
rows-worth of space instead of millions of snapshot rows — free for years.

`point_count` is denormalized so we can size/verify without decoding the blob.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class PriceHistory(Base):
    __tablename__ = "price_history"

    product_id = Column(UUID(as_uuid=True), primary_key=True)
    series = Column(JSONB, nullable=False, default=list)        # [[epoch_day, price], ...]
    point_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
