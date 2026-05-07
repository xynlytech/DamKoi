"""Add last_backfilled_at to products

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-05-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Track when we last ran Wayback backfill on each product.
    # Nullable — products never backfilled have NULL, ordered nulls-first
    # by the backfill scheduler so they get priority.
    op.add_column(
        'products',
        sa.Column('last_backfilled_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('products', 'last_backfilled_at')
