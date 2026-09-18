"""Enable row level security on public tables exposed through PostgREST

Supabase Advisor flagged these tables as "RLS Disabled in Public": with the
default grants, anyone holding the public anon key could read and write them
through the REST API. Enabling RLS with no policies denies anon/authenticated
access entirely. Nothing in the app needs that access:

- backend + scraper connect as the table owner (postgres), which bypasses RLS
- web route handlers use the service_role key, which bypasses RLS
- the browser-side anon client is only used for Auth

Revision ID: e7f1a2b3c4d5
Revises: 4225a77a4926
Create Date: 2026-09-14
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "e7f1a2b3c4d5"
down_revision = "4225a77a4926"
branch_labels = None
depends_on = None

TABLES = (
    "products",
    "price_snapshots",
    "price_history",
    "match_groups",
    "coupons",
    "coupon_applications",
    "alembic_version",
)


# IF EXISTS: price_history was created directly in Supabase, not by a
# migration, so it is absent from fresh databases (CI, local dev).


def upgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE IF EXISTS public."{table}" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE IF EXISTS public."{table}" DISABLE ROW LEVEL SECURITY')
