"""add coupon_applications table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'coupon_applications',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('anon_id', sa.String(255), nullable=True),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('coupon_code', sa.String(255), nullable=True),
        sa.Column('cart_total', sa.Integer(), nullable=True),
        sa.Column('savings', sa.Integer(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_coupon_applications_user_id', 'coupon_applications', ['user_id'])
    op.create_index('ix_coupon_applications_anon_id', 'coupon_applications', ['anon_id'])
    op.create_index('ix_coupon_applications_created_at', 'coupon_applications', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_coupon_applications_created_at', table_name='coupon_applications')
    op.drop_index('ix_coupon_applications_anon_id', table_name='coupon_applications')
    op.drop_index('ix_coupon_applications_user_id', table_name='coupon_applications')
    op.drop_table('coupon_applications')
