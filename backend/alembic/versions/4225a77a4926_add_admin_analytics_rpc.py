"""add_admin_analytics_rpc

Revision ID: 4225a77a4926
Revises: c1d2e3f4a5b6
Create Date: 2026-06-19 20:52:58.089848

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4225a77a4926'
down_revision: Union[str, None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
    CREATE OR REPLACE FUNCTION admin_analytics(days int DEFAULT 30)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        result json;
    BEGIN
        SELECT json_build_object(
            'products_trend', (
                SELECT COALESCE(json_agg(t), '[]'::json)
                FROM (
                    SELECT date(first_seen_at) as date, count(*)::int as count
                    FROM products
                    WHERE first_seen_at >= current_date - days + 1
                    GROUP BY date(first_seen_at)
                    ORDER BY date
                ) t
            ),
            'snapshots_trend', (
                SELECT COALESCE(json_agg(t), '[]'::json)
                FROM (
                    SELECT date(scraped_at) as date, count(*)::int as count
                    FROM price_snapshots
                    WHERE scraped_at >= current_date - days + 1
                    GROUP BY date(scraped_at)
                    ORDER BY date
                ) t
            ),
            'platforms', (
                SELECT COALESCE(json_agg(t), '[]'::json)
                FROM (
                    SELECT 
                        platform,
                        count(*)::int as total,
                        count(current_price)::int as priced,
                        count(*) filter (where current_price is null)::int as stubs
                    FROM products
                    GROUP BY platform
                ) t
            ),
            'catalog', (
                SELECT json_build_object(
                    'total', count(*)::int,
                    'priced', count(current_price)::int,
                    'stubs', count(*) filter (where current_price is null)::int,
                    'quality_pct', (CASE WHEN count(*) > 0 THEN round(count(current_price) * 100.0 / count(*)) ELSE 0 END)::int,
                    'added_today', count(*) filter (where first_seen_at >= current_date)::int,
                    'added_7d', count(*) filter (where first_seen_at >= current_date - 7)::int,
                    'added_30d', count(*) filter (where first_seen_at >= current_date - 30)::int
                )
                FROM products
            ),
            'snapshots', (
                SELECT json_build_object(
                    'total', (SELECT count(*)::int FROM price_snapshots),
                    'today', (SELECT count(*)::int FROM price_snapshots WHERE scraped_at >= current_date),
                    'last_7d', (SELECT count(*)::int FROM price_snapshots WHERE scraped_at >= current_date - 7)
                )
            ),
            'storage', (
                SELECT json_build_object(
                    'used_bytes', pg_database_size(current_database()),
                    'used', pg_size_pretty(pg_database_size(current_database())),
                    'limit_bytes', 524288000,
                    'limit', '500 MB',
                    'usage_pct', round((pg_database_size(current_database())::numeric / 524288000.0) * 100)::int
                )
            )
        ) INTO result;

        RETURN result;
    END;
    $$;
    """)

def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS admin_analytics(int);")
