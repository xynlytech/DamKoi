"""Purge 2026-05-31 bad price history entries (original price stored instead of discounted)

Revision ID: b3c4d5e6f7a8
Revises: 9f1a2b3c4d5e
Create Date: 2026-06-01 00:00:00.000000

epoch_day 20604 = 2026-05-31 UTC
All entries with that day recorded current_original_price instead of current_price.
"""
from typing import Sequence, Union

from alembic import op


revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "9f1a2b3c4d5e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BAD_DAY = 20604  # 2026-05-31 UTC


def upgrade() -> None:
    # Step 1: strip epoch_day 20604 from every price_history series,
    # decrement point_count by the number of removed entries.
    op.execute(
        f"""
        WITH removed AS (
            SELECT
                product_id,
                COUNT(*) FILTER (WHERE (elem->>0)::int = {BAD_DAY}) AS removed_count,
                jsonb_agg(elem ORDER BY ord)
                    FILTER (WHERE (elem->>0)::int <> {BAD_DAY})    AS cleaned_series
            FROM price_history,
                 jsonb_array_elements(series) WITH ORDINALITY AS t(elem, ord)
            GROUP BY product_id
            HAVING COUNT(*) FILTER (WHERE (elem->>0)::int = {BAD_DAY}) > 0
        )
        UPDATE price_history ph
        SET
            series      = COALESCE(r.cleaned_series, '[]'::jsonb),
            point_count = GREATEST(0, ph.point_count - r.removed_count),
            updated_at  = now()
        FROM removed r
        WHERE ph.product_id = r.product_id
        """
    )

    # Step 2: clear stale denormalized columns on products whose
    # price_changed_at was set from the bad May-31 data.
    op.execute(
        """
        UPDATE products
        SET previous_price        = NULL,
            price_changed_at      = NULL,
            price_change_delta_pct = NULL
        WHERE price_changed_at >= '2026-05-31'
          AND price_changed_at  < '2026-06-01'
        """
    )

    # Step 3: recompute previous_price / price_changed_at / price_change_delta_pct
    # from the now-clean price_history series.
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
                price       AS current_price,
                epoch_day   AS changed_day,
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
        SET previous_price         = previous.previous_price,
            price_changed_at       = to_timestamp(latest.changed_day * 86400),
            price_change_delta_pct = CASE
                WHEN previous.previous_price > 0
                THEN ROUND(
                    (((latest.current_price - previous.previous_price)::numeric
                      / previous.previous_price) * 100)
                )::smallint
                ELSE NULL
            END
        FROM latest
        JOIN previous ON previous.product_id = latest.product_id
        WHERE pr.id = latest.product_id
          AND latest.current_price IS NOT NULL
        """
    )


def downgrade() -> None:
    # Data cleanup — not reversible.
    pass
