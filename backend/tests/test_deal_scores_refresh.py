"""The deals page reads the deal_scores materialized view; each scrape pass
must refresh it, and a failed refresh must never stop the scraper."""
from unittest.mock import AsyncMock

import run_cron
from app.scraper import tasks


class FakeSession:
    def __init__(self, fail=False):
        self.fail = fail
        self.executed = []
        self.committed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def execute(self, stmt, params=None):
        sql = str(stmt)
        if self.fail and "REFRESH" in sql:
            raise RuntimeError("connection was closed in the middle of operation")
        self.executed.append(sql)

    async def commit(self):
        self.committed = True


async def test_refresh_rebuilds_view_concurrently(monkeypatch):
    session = FakeSession()
    monkeypatch.setattr(tasks, "async_session_factory", lambda: session)

    await tasks.refresh_deal_scores()

    assert any("REFRESH MATERIALIZED VIEW CONCURRENTLY" in s and "deal_scores" in s for s in session.executed)
    assert session.committed


async def test_refresh_failure_does_not_raise(monkeypatch):
    monkeypatch.setattr(tasks, "async_session_factory", lambda: FakeSession(fail=True))

    await tasks.refresh_deal_scores()  # must not raise


async def test_scrape_pass_refreshes_deals_after_longtail(monkeypatch):
    calls = []
    for name in ("scrape_hot_products", "scrape_tracked_products", "scrape_longtail_products", "refresh_deal_scores"):
        async def record(*args, _name=name, **kwargs):
            calls.append(_name)
        monkeypatch.setattr(tasks, name, record)

    await run_cron.run_scrape()

    assert calls[-2:] == ["scrape_longtail_products", "refresh_deal_scores"]
