"""
DamKoi — Feature Flag Service

Simple environment-variable-driven feature flags for platform rollouts.
New platforms stay hidden behind flags until QA passes.

Usage:
    from app.services.flags import is_platform_enabled
    if is_platform_enabled("cartup"):
        # serve Cartup data

Configuration:
    ENABLED_PLATFORMS=daraz,cartup,rokomari   (comma-separated in .env)
    
    If ENABLED_PLATFORMS is not set, only 'daraz' is enabled by default.
"""

import os
from functools import lru_cache
from typing import Set


@lru_cache(maxsize=1)
def _get_enabled_set() -> Set[str]:
    """Parse ENABLED_PLATFORMS env var into a set. Cached for process lifetime."""
    raw = os.environ.get("ENABLED_PLATFORMS", "daraz")
    return {p.strip().lower() for p in raw.split(",") if p.strip()}


def is_platform_enabled(platform_name: str) -> bool:
    """Check if a platform is enabled for production traffic."""
    return platform_name.lower() in _get_enabled_set()


def get_enabled_platform_names() -> Set[str]:
    """Return the set of enabled platform names."""
    return _get_enabled_set()


def is_feature_enabled(feature_name: str) -> bool:
    """
    Generic feature flag check.
    
    Features are enabled via FEATURE_<NAME>=true env vars.
    E.g., FEATURE_COUPON_AUTO_APPLY=true
    """
    env_key = f"FEATURE_{feature_name.upper()}"
    return os.environ.get(env_key, "false").lower() in ("true", "1", "yes")
