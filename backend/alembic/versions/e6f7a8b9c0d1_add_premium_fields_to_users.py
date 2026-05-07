"""Add is_premium and premium_expires_at to users

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-05-07 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # is_premium: free-tier cap check in alerts.py uses this.
    # Default False — all existing users are on free tier.
    op.add_column(
        'users',
        sa.Column('is_premium', sa.Boolean(), nullable=False, server_default='false'),
    )
    # premium_expires_at: NULL = never expires / not premium.
    op.add_column(
        'users',
        sa.Column('premium_expires_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'premium_expires_at')
    op.drop_column('users', 'is_premium')
