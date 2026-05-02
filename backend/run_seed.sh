#!/usr/bin/env bash
# DamKoi — Database Seeder Runner
# Usage: ./run_seed.sh [--urls N] [--scrape] [--workers N] [--resume]
#
# Examples:
#   ./run_seed.sh                        # Discover 500 URLs, print only
#   ./run_seed.sh --scrape               # Discover + scrape 500 URLs into DB
#   ./run_seed.sh --urls 2000 --scrape   # Discover + scrape 2000 URLs
#   ./run_seed.sh --scrape --resume      # Scrape, skip already-tracked products

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Activate virtualenv
if [ -f "$SCRIPT_DIR/venv/bin/activate" ]; then
  source "$SCRIPT_DIR/venv/bin/activate"
  echo "✅ Virtualenv activated"
else
  echo "⚠️  No venv found at $SCRIPT_DIR/venv — using system Python"
fi

cd "$SCRIPT_DIR"

echo ""
echo "🌱 DamKoi Seeder"
echo "   Args: $*"
echo "   Time: $(date)"
echo ""

python3 -m app.scraper.seed "$@"
