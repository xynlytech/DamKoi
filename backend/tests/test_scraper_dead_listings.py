"""Delisted Daraz products (HTTP 404) must not look like a scraper outage.

Before the fix, a batch made only of delisted stubs sent the Playwright
fallback into a retry loop that tripped Daraz's CAPTCHA and flooded Telegram
with "CRITICAL SCRAPER FAILURE" alerts every scrape pass.
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.scraper import daraz_scraper, tasks
from app.scraper.daraz_scraper import DarazScraper

URL = "https://www.daraz.com.bd/i474257211-s2277935884.html"
URL2 = "https://www.daraz.com.bd/i241285320-s1184705503.html"


class FakeResp:
    def __init__(self, status):
        self.status = status


class FakePage:
    def __init__(self, status, title):
        self.status = status
        self._title = title
        self.goto_calls = 0

    async def goto(self, url, **kwargs):
        self.goto_calls += 1
        return FakeResp(self.status)

    async def title(self):
        return self._title

    async def set_viewport_size(self, size):
        pass

    async def close(self):
        pass


class FakeContext:
    def __init__(self, page):
        self.page = page

    async def new_page(self):
        return self.page


class FakeStealth:
    async def apply_stealth_async(self, page):
        pass


def _scraper(monkeypatch, status, title):
    monkeypatch.setattr(daraz_scraper, "Stealth", FakeStealth)
    page = FakePage(status, title)
    scraper = DarazScraper(delay_range=(0, 0))
    scraper._context = FakeContext(page)
    notify = AsyncMock()
    monkeypatch.setattr(scraper, "_notify_failure", notify)
    return scraper, page, notify


async def test_404_is_recorded_as_dead_not_as_failure(monkeypatch):
    scraper, page, notify = _scraper(monkeypatch, status=404, title="error")

    for _ in range(5):
        assert await scraper.scrape_product(URL) is None

    assert scraper.dead_urls == {URL}
    assert scraper._consecutive_failures == 0
    assert page.goto_calls == 5  # no "block detected" re-navigation
    notify.assert_not_called()


async def test_failure_alert_sent_once_per_session(monkeypatch):
    scraper, _, notify = _scraper(monkeypatch, status=200, title="Some product")
    for name in (
        "_extract_from_module_data",
        "_extract_from_next_data",
        "_extract_from_dom",
        "_save_debug_snapshot",
    ):
        monkeypatch.setattr(scraper, name, AsyncMock(return_value=None))

    for _ in range(10):
        await scraper.scrape_product(URL)

    assert scraper._consecutive_failures == 10
    notify.assert_awaited_once()


def _agent_fakes(monkeypatch, scrape_batch):
    telegram = SimpleNamespace(send_alert=AsyncMock())
    monkeypatch.setattr(tasks, "get_telegram_service", lambda: telegram)
    monkeypatch.setattr(tasks.asyncio, "sleep", AsyncMock())
    retire = AsyncMock()
    monkeypatch.setattr(tasks, "_retire_dead_urls", retire)
    seen = []

    class FakeScraper:
        def __init__(self, headless=True):
            self.dead_urls = set()

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def scrape_batch(self, urls):
            seen.append(list(urls))
            return await scrape_batch(self, urls)

    monkeypatch.setattr(tasks, "DarazScraper", FakeScraper)
    return telegram, retire, seen


async def test_agent_all_dead_retires_without_retry_or_alert(monkeypatch):
    async def all_gone(scraper, urls):
        scraper.dead_urls.update(urls)
        return []

    telegram, retire, seen = _agent_fakes(monkeypatch, all_gone)

    assert await tasks.ScrapeAgent("Playwright-B").run([URL, URL2]) == 0

    assert seen == [[URL, URL2]]
    retire.assert_awaited_once()
    assert set(retire.await_args.args[0]) == {URL, URL2}
    telegram.send_alert.assert_not_called()


async def test_agent_retries_only_live_urls_and_alerts_once(monkeypatch):
    async def first_gone_rest_blocked(scraper, urls):
        if URL in urls:
            scraper.dead_urls.add(URL)
        return []

    telegram, retire, seen = _agent_fakes(monkeypatch, first_gone_rest_blocked)

    assert await tasks.ScrapeAgent("Playwright-B").run([URL, URL2]) == 0

    assert seen == [[URL, URL2], [URL2], [URL2]]
    retire.assert_awaited_once()
    telegram.send_alert.assert_awaited_once()


class FakeSession:
    def __init__(self):
        self.executed = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def execute(self, stmt, params=None):
        self.executed.append((str(stmt), params))

    async def commit(self):
        pass


def _fast_path_fakes(monkeypatch, mtop_healthy):
    from app.scraper import daraz_http

    monkeypatch.setattr(daraz_http, "scrape_batch_http", AsyncMock(return_value=[]))
    monkeypatch.setattr(tasks, "_mtop_healthy", AsyncMock(return_value=mtop_healthy))
    monkeypatch.setattr(daraz_scraper, "PLAYWRIGHT_AVAILABLE", True)
    session = FakeSession()
    monkeypatch.setattr(tasks, "async_session_factory", lambda: session)
    agent_runs = []

    class FakeAgent:
        def __init__(self, batch_name, platform="daraz"):
            pass

        async def run(self, urls):
            agent_runs.append(list(urls))
            return 0

    monkeypatch.setattr(tasks, "ScrapeAgent", FakeAgent)
    return session, agent_runs


async def test_zero_yield_with_healthy_mtop_counts_misses_and_skips_playwright(monkeypatch):
    session, agent_runs = _fast_path_fakes(monkeypatch, mtop_healthy=True)

    assert await tasks._scrape_urls_fast([URL, URL2], label="B") == 0

    assert agent_runs == []
    (sql, params), = session.executed
    assert "consecutive_misses + 1" in sql
    assert set(params["ext"]) == {"474257211", "241285320"}


async def test_zero_yield_with_blocked_mtop_falls_back_to_playwright(monkeypatch):
    session, agent_runs = _fast_path_fakes(monkeypatch, mtop_healthy=False)

    await tasks._scrape_urls_fast([URL, URL2], label="B")

    assert agent_runs == [[URL, URL2]]
    assert session.executed == []  # a blocked session must not penalise products


async def test_pass_b_skips_stubs_already_at_prune_threshold(monkeypatch):
    calls = []

    async def fake_fetch(where_clauses, order_by, offset, limit):
        calls.append(where_clauses)
        return []

    monkeypatch.setattr(tasks, "_fetch_product_urls", fake_fetch)

    await tasks.scrape_longtail_products()

    pass_b = " ".join(str(c) for c in calls[1])
    assert "consecutive_misses <" in pass_b
