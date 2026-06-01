"""Merge GIN index branch into main migration chain

Revision ID: c1d2e3f4a5b6
Revises: b3c4d5e6f7a8, g8b9c0d1e2f3
Create Date: 2026-06-02 00:00:00.000000

g8b9c0d1e2f3 (add pg_trgm GIN index on products.title) branched from
f7a8b9c0d1e2 on 2026-05-30 but was never merged back into the main chain.
This migration merges both heads so alembic upgrade head works again.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, tuple, None] = ("b3c4d5e6f7a8", "g8b9c0d1e2f3")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
