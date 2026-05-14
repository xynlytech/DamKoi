"""Add push_subscriptions table and coupon payment_method column

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-05-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── push_subscriptions ─────────────────────────────────────
    op.create_table(
        'push_subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('subscription_json', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('idx_push_sub_email_active', 'push_subscriptions', ['email', 'is_active'])

    # ── coupons.payment_method ─────────────────────────────────
    # NULL = valid for all payment methods; 'bkash', 'nagad', 'card', etc.
    op.add_column(
        'coupons',
        sa.Column('payment_method', sa.String(50), nullable=True),
    )
    op.create_index('idx_coupons_payment_method', 'coupons', ['payment_method'])


def downgrade() -> None:
    op.drop_index('idx_coupons_payment_method', table_name='coupons')
    op.drop_column('coupons', 'payment_method')
    op.drop_index('idx_push_sub_email_active', table_name='push_subscriptions')
    op.drop_table('push_subscriptions')
