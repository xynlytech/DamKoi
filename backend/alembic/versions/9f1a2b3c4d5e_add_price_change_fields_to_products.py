"""Add price change fields to products

Revision ID: 9f1a2b3c4d5e
Revises: 23e27ec2b7c4
Create Date: 2026-05-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f1a2b3c4d5e"
down_revision: Union[str, None] = "23e27ec2b7c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("previous_price", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("price_changed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("products", sa.Column("price_change_delta_pct", sa.SmallInteger(), nullable=True))

    op.create_index(
        "idx_products_price_changed_at",
        "products",
        ["price_changed_at"],
        unique=False,
        postgresql_where=sa.text("price_changed_at IS NOT NULL"),
    )
    op.create_index(
        "idx_products_price_change_delta",
        "products",
        ["price_change_delta_pct"],
        unique=False,
        postgresql_where=sa.text("price_change_delta_pct IS NOT NULL"),
    )

    op.execute(
        """
        WITH points AS (
            SELECT
                ph.product_id,
                (elem->>0)::int AS epoch_day,
                (elem->>1)::int AS price,
                ordinality
            FROM price_history ph
            JOIN LATERAL jsonb_array_elements(ph.series) WITH ORDINALITY AS t(elem, ordinality) ON TRUE
        ),
        latest AS (
            SELECT DISTINCT ON (product_id)
                product_id,
                price AS current_price,
                epoch_day AS changed_day,
                ordinality
            FROM points
            ORDER BY product_id, ordinality DESC
        ),
        previous AS (
            SELECT DISTINCT ON (p.product_id)
                p.product_id,
                p.price AS previous_price
            FROM points p
            JOIN latest l ON l.product_id = p.product_id
            WHERE p.price <> l.current_price
              AND p.ordinality < l.ordinality
            ORDER BY p.product_id, p.ordinality DESC
        )
        UPDATE products pr
        SET previous_price = previous.previous_price,
            price_changed_at = to_timestamp(latest.changed_day * 86400),
            price_change_delta_pct = CASE
                WHEN previous.previous_price > 0
                    THEN ROUND((((latest.current_price - previous.previous_price)::numeric / previous.previous_price) * 100))::smallint
                ELSE NULL
            END
        FROM latest
        JOIN previous ON previous.product_id = latest.product_id
        WHERE pr.id = latest.product_id
          AND latest.current_price IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("idx_products_price_change_delta", table_name="products")
    op.drop_index("idx_products_price_changed_at", table_name="products")
    op.drop_column("products", "price_change_delta_pct")
    op.drop_column("products", "price_changed_at")
    op.drop_column("products", "previous_price")
