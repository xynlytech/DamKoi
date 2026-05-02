"""Add coupons table

Revision ID: a1b2c3d4e5f6
Revises: dd56eb78c4d6
Create Date: 2026-04-24 17:39:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'dd56eb78c4d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'coupons',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('product_id', sa.UUID(), nullable=True),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=True),
        sa.Column('discount_pct', sa.Integer(), nullable=True),
        sa.Column('discount_flat', sa.Integer(), nullable=True),
        sa.Column('min_spend', sa.Integer(), nullable=True),
        sa.Column('max_uses', sa.Integer(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_coupons_product_active', 'coupons', ['product_id', 'is_active'])
    op.create_index('idx_coupons_code', 'coupons', ['code'])


def downgrade() -> None:
    op.drop_index('idx_coupons_code', table_name='coupons')
    op.drop_index('idx_coupons_product_active', table_name='coupons')
    op.drop_table('coupons')
