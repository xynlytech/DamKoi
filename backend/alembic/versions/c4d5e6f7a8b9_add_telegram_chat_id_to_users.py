"""Add telegram_chat_id to users

Revision ID: c4d5e6f7a8b9
Revises: 9b278a858d41
Create Date: 2026-05-05 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = '9b278a858d41'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add telegram_chat_id to users table.
    # Nullable — users only have this set after linking via /alerts/telegram/link.
    op.add_column(
        'users',
        sa.Column('telegram_chat_id', sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'telegram_chat_id')
