#!/bin/sh
# DamKoi backend startup script
# Runs migrations if DATABASE_URL is set, then starts uvicorn.
# Migration failure is logged but does NOT abort startup —
# the API can still serve cached/static responses while DB is fixed.

set -e

if [ -n "$DATABASE_URL" ]; then
    echo "[startup] Running Alembic migrations..."
    if alembic upgrade head; then
        echo "[startup] Migrations complete."
    else
        echo "[startup] WARNING: Migrations failed. Starting server anyway — check DATABASE_URL and Alembic logs."
    fi
else
    echo "[startup] WARNING: DATABASE_URL not set. Skipping migrations."
fi

echo "[startup] Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
