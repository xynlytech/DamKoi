"""merge_heads

Revision ID: 23e27ec2b7c4
Revises: a8b9c0d1e2f3, b2c3d4e5f6a7
Create Date: 2026-05-14 23:15:23.122993

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '23e27ec2b7c4'
down_revision: Union[str, None] = ('a8b9c0d1e2f3', 'b2c3d4e5f6a7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
