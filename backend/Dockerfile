# ── Stage 1: Build dependencies ──────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install system dependencies (build tools only)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into a prefix we can copy
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Production image ─────────────────────────────────
FROM python:3.12-slim AS production

# Security: run as non-root
RUN addgroup --system damkoi && adduser --system --ingroup damkoi damkoi

WORKDIR /app

# Copy only the installed packages from builder (no build tools)
COPY --from=builder /install /usr/local

# Copy application code
COPY --chown=damkoi:damkoi . .

# Install Playwright Chromium (scraper requirement)
RUN pip install --no-cache-dir playwright && \
    playwright install chromium --with-deps

# Make startup script executable
RUN chmod +x start.sh

# Switch to non-root user
USER damkoi

# Expose port
EXPOSE 8000

# start.sh: runs alembic (non-fatally if DB unreachable), then uvicorn
CMD ["./start.sh"]
