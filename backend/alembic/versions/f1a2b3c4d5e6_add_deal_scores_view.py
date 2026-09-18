"""Add deal_scores materialized view for the deals page

The deals API used to score only the 200 most recent price drops per request
(price history for every candidate had to be pulled into the route), so the
deals page showed ~35 of ~9,500 qualifying products. This view scores every
product whose latest price change was a drop, in SQL, with the same rules as
web/src/lib/verdict.ts (getVerdict). The API pages through it; the scraper
refreshes it after each pass (REFRESH ... CONCURRENTLY, needs the unique index).

JS Math.round(x) is written as floor(x + 0.5) so scores match the TS verdict.

Revision ID: f1a2b3c4d5e6
Revises: e7f1a2b3c4d5
Create Date: 2026-09-19
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "f1a2b3c4d5e6"
down_revision = "e7f1a2b3c4d5"
branch_labels = None
depends_on = None

VIEW_SQL = """
CREATE MATERIALIZED VIEW public.deal_scores AS
WITH cand AS (
    SELECT p.id, p.platform, p.category, p.price_changed_at,
           p.current_price::numeric AS cur,
           CASE WHEN p.first_seen_at IS NULL THEN 0
                ELSE GREATEST(0, floor(extract(epoch FROM (p.last_scraped_at - p.first_seen_at)) / 86400))
           END AS tracking_days,
           h.series
    FROM public.products p
    JOIN public.price_history h ON h.product_id = p.id
    WHERE p.is_active
      AND p.last_scraped_at IS NOT NULL
      AND p.price_change_delta_pct < 0
      AND p.current_price > 0
      AND jsonb_array_length(h.series) >= 2
),
stats AS (
    SELECT c.id,
           count(*) FILTER (WHERE (e->>0)::numeric * 86400 >= extract(epoch FROM now() - interval '30 days')) AS n30,
           avg((e->>1)::numeric) FILTER (WHERE (e->>0)::numeric * 86400 >= extract(epoch FROM now() - interval '30 days')) AS mean30,
           min((e->>1)::numeric) AS lo_hist,
           max((e->>1)::numeric) AS hi_hist
    FROM cand c
    CROSS JOIN LATERAL jsonb_array_elements(c.series) e
    GROUP BY c.id
),
base AS (
    SELECT c.id, c.platform, c.category, c.price_changed_at, c.cur, c.tracking_days, s.n30,
           floor(coalesce(s.mean30, c.cur) + 0.5) AS avg30,
           least(s.lo_hist, c.cur) AS lo,
           greatest(s.hi_hist, c.cur) AS hi
    FROM cand c
    JOIN stats s ON s.id = c.id
),
scored AS (
    SELECT b.*,
           CASE WHEN b.avg30 > 0 THEN (b.avg30 - b.cur) / b.avg30 ELSE 0 END AS disc,
           (b.n30 >= 5 OR b.tracking_days >= 14) AS enough
    FROM base b
)
SELECT id AS product_id, platform, category, price_changed_at,
       CASE
           WHEN NOT enough THEN 'INSUFFICIENT_DATA'
           WHEN hi - lo <= greatest(1, cur * 0.01) THEN 'FAIR_PRICE'
           WHEN cur > avg30 * 1.05 THEN 'FAKE_DISCOUNT'
           WHEN cur <= lo * 1.02 THEN 'BEST_PRICE'
           WHEN disc >= 0.1 THEN 'GOOD_DEAL'
           WHEN disc >= 0 THEN 'FAIR_PRICE'
           ELSE 'FAKE_DISCOUNT'
       END AS label,
       (CASE
           WHEN NOT enough THEN 5
           WHEN hi - lo <= greatest(1, cur * 0.01) THEN 5
           WHEN cur > avg30 * 1.05 THEN greatest(1, floor(3 - (cur / avg30 - 1) * 10 + 0.5))
           WHEN cur <= lo * 1.02 THEN 10
           WHEN disc >= 0.1 THEN least(9, 7 + floor(disc * 20 + 0.5))
           WHEN disc >= 0 THEN 5
           ELSE greatest(1, 3 + floor(disc * 10 + 0.5))
       END)::smallint AS deal_score
FROM scored
"""


def upgrade() -> None:
    bind = op.get_bind()
    # price_history was created directly in Supabase, not by a migration, so
    # it is absent from fresh databases (CI, local dev). Nothing to score there.
    if bind.execute(sa.text("SELECT to_regclass('public.price_history')")).scalar() is None:
        return

    op.execute(VIEW_SQL)
    op.execute("CREATE UNIQUE INDEX deal_scores_product_id_idx ON public.deal_scores (product_id)")
    op.execute(
        "CREATE INDEX deal_scores_rank_idx ON public.deal_scores "
        "(deal_score DESC, price_changed_at DESC NULLS LAST)"
    )

    # Only the web route handlers (service_role key) read it.
    has_supabase_roles = bind.execute(
        sa.text("SELECT count(*) FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')")
    ).scalar() == 3
    if has_supabase_roles:
        op.execute("REVOKE ALL ON public.deal_scores FROM anon, authenticated")
        op.execute("GRANT SELECT ON public.deal_scores TO service_role")
        op.execute("NOTIFY pgrst, 'reload schema'")


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS public.deal_scores")
