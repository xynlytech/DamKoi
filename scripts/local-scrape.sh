#!/usr/bin/env bash
# DamKoi — run the scraper pipeline on this machine instead of GitHub Actions.
#
# Mirrors .github/workflows/scraper.yml (migrate → harvest → scrape-loop →
# prune → platforms, with alerts checked inside scrape-loop) as one endless
# cycle, so the GitHub schedule can stay disabled while this runs.
#
# Usage:
#   scripts/local-scrape.sh start    # start in the background (keeps the Mac awake)
#   scripts/local-scrape.sh stop     # stop the loop and any running job
#   scripts/local-scrape.sh status   # is it running, what step is it on
#   scripts/local-scrape.sh logs     # follow the log
#   scripts/local-scrape.sh once     # one full cycle in the foreground (for testing)
#   scripts/local-scrape.sh job <name>   # run a single run_cron.py job, e.g. "job harvest"
#
# Tunables (env): SCRAPE_LOOP_MINUTES (default 330), DAMKOI_VENV (default backend/.venv),
#                 LOCAL_SCRAPE_SKIP_MIGRATE=1 to skip `alembic upgrade head`,
#                 LOCAL_SCRAPE_SKIP_HARVEST=1 to stop discovering new products (holds DB size).

set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_DIR/backend"
VENV="${DAMKOI_VENV:-$BACKEND_DIR/.venv}"
PY="$VENV/bin/python"
LOG_DIR="$BACKEND_DIR/logs"
LOG_FILE="$LOG_DIR/local-scrape.log"
PID_FILE="$LOG_DIR/local-scrape.pid"
STATE_FILE="$LOG_DIR/local-scrape.state"

mkdir -p "$LOG_DIR"

log() { printf '%s [local-scrape] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

# Same environment the GitHub workflow sets. Values from backend/.env still
# apply for everything not listed here (DATABASE_URL, SUPABASE_*, RESEND_*).
export_job_env() {
  export ENABLED_PLATFORMS="${ENABLED_PLATFORMS:-daraz,rokomari,pickaboo,cartup,chaldal,othoba}"
  export DAMKOI_NULLPOOL=1          # avoid asyncpg prepared-statement clashes on pgBouncer
  export APP_DEBUG=false            # no SQL echo
  export REDIS_URL=""               # cron path runs without Redis
  export SCRAPE_LOOP_MINUTES="${SCRAPE_LOOP_MINUTES:-330}"
  export SCRAPE_LOOP_REST="${SCRAPE_LOOP_REST:-30}"
  export PYTHONUNBUFFERED=1
  export CRON_QUIET_HTTP=1          # keep the log readable (no per-request httpx lines)
}

CHILD_PID=""

# Run one run_cron.py job, retrying on failure (this laptop's network drops).
run_job() {
  local job="$1" attempts="${2:-3}" n=1
  while :; do
    printf '%s %s (attempt %s)\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$job" "$n" > "$STATE_FILE"
    log "=== $job: start (attempt $n/$attempts) ==="
    ( cd "$BACKEND_DIR" && exec "$PY" run_cron.py "$job" ) &
    CHILD_PID=$!
    wait "$CHILD_PID"
    local rc=$?
    CHILD_PID=""
    if [ "$rc" -eq 0 ]; then
      log "=== $job: done ==="
      return 0
    fi
    log "=== $job: exit $rc ==="
    if [ "$n" -ge "$attempts" ]; then
      log "=== $job: giving up after $attempts attempts, continuing with next step ==="
      return "$rc"
    fi
    n=$((n + 1))
    log "retrying $job in 5 minutes"
    sleep 300
  done
}

migrate() {
  if [ "${LOCAL_SCRAPE_SKIP_MIGRATE:-0}" = "1" ]; then
    log "skipping alembic upgrade head (LOCAL_SCRAPE_SKIP_MIGRATE=1)"
    return 0
  fi
  log "=== migrate: alembic upgrade head ==="
  ( cd "$BACKEND_DIR" && "$VENV/bin/alembic" upgrade head ) && log "=== migrate: done ===" \
    || log "=== migrate: FAILED (continuing; scraper works against the current schema) ==="
}

cycle() {
  if [ "${LOCAL_SCRAPE_SKIP_HARVEST:-0}" = "1" ]; then
    log "skipping harvest (LOCAL_SCRAPE_SKIP_HARVEST=1): no new products seeded, DB size held"
  else
    run_job harvest
  fi
  run_job scrape-loop 1       # has its own time budget; a crash just moves on to prune
  run_job prune
  run_job platforms
}

on_term() {
  log "stop requested"
  if [ -n "$CHILD_PID" ]; then
    kill "$CHILD_PID" 2>/dev/null
    wait "$CHILD_PID" 2>/dev/null
  fi
  rm -f "$PID_FILE" "$STATE_FILE"
  exit 0
}

loop() {
  trap on_term TERM INT
  echo $$ > "$PID_FILE"
  # Keep the machine awake (idle + system sleep) for as long as this loop lives.
  caffeinate -is -w $$ &
  export_job_env
  log "started (pid $$, venv $VENV, SCRAPE_LOOP_MINUTES=$SCRAPE_LOOP_MINUTES)"
  migrate
  while :; do
    cycle
    log "cycle finished; next cycle in 60s"
    sleep 60
  done
}

running_pid() {
  [ -f "$PID_FILE" ] || return 1
  local pid
  pid="$(cat "$PID_FILE")"
  kill -0 "$pid" 2>/dev/null && echo "$pid"
}

case "${1:-}" in
  start)
    if pid="$(running_pid)"; then
      echo "already running (pid $pid). Use: $0 status | logs | stop"
      exit 0
    fi
    [ -x "$PY" ] || { echo "python not found at $PY (set DAMKOI_VENV)"; exit 1; }
    nohup bash "$0" __loop >> "$LOG_FILE" 2>&1 &
    sleep 2
    if pid="$(running_pid)"; then
      echo "started (pid $pid). Log: $LOG_FILE"
    else
      echo "failed to start; see $LOG_FILE"; exit 1
    fi
    ;;
  stop)
    if pid="$(running_pid)"; then
      kill "$pid"
      for _ in $(seq 1 30); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
      pkill -f "$BACKEND_DIR/run_cron.py" 2>/dev/null || true
      echo "stopped"
    else
      echo "not running"
    fi
    rm -f "$PID_FILE" "$STATE_FILE"
    ;;
  status)
    if pid="$(running_pid)"; then
      echo "running (pid $pid)"
      [ -f "$STATE_FILE" ] && echo "current step: $(cat "$STATE_FILE")"
      echo "last log lines:"; tail -n 5 "$LOG_FILE" 2>/dev/null
    else
      echo "not running"
    fi
    ;;
  logs)
    tail -n 50 -f "$LOG_FILE"
    ;;
  once)
    export_job_env
    migrate
    cycle
    ;;
  job)
    [ -n "${2:-}" ] || { echo "usage: $0 job <harvest|scrape|scrape-loop|platforms|alerts|prune>"; exit 1; }
    export_job_env
    run_job "$2" 1
    ;;
  __loop)
    loop
    ;;
  *)
    sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
