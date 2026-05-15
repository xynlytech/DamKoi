"""Smoke tests — verify imports and basic config load without a live DB."""
import importlib


def test_models_importable():
    importlib.import_module("app.models.product")
    importlib.import_module("app.models.price_snapshot")
    importlib.import_module("app.models.alert")


def test_settings_load(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost/db")
    monkeypatch.setenv("APP_ENV", "test")
    importlib.invalidate_caches()
    from app.config import Settings
    s = Settings()
    assert s.APP_ENV == "test"
