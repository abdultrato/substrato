#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${RUN_PRODUCTION_READINESS_CHECK:-1}" == "1" ]]; then
  echo "[release] running production readiness gate..."
  python scripts/production_readiness_check.py
fi

if [[ "${RUN_MIGRATIONS_ON_START:-1}" == "1" ]]; then
  echo "[release] running migrations with operational lock..."
  python scripts/migrate_with_lock.py
fi

# Start Django ASGI on port 8000 in the background.
# Next.js will proxy /api, /admin, /pdf, /static, /media to it.
DJANGO_BIND="${DJANGO_BIND:-127.0.0.1:8000}"
DJANGO_HOST="${DJANGO_BIND%:*}"
DJANGO_PORT="${DJANGO_BIND##*:}"

python -m uvicorn platform.asgi:application \
  --host "$DJANGO_HOST" \
  --port "$DJANGO_PORT" \
  --workers "${ASGI_WORKERS:-2}" \
  --timeout-keep-alive "${ASGI_KEEPALIVE_TIMEOUT:-30}" \
  --proxy-headers \
  --forwarded-allow-ips "${ASGI_FORWARDED_ALLOW_IPS:-*}" &

DJANGO_PID=$!

# Forward signals so the platform can stop both processes cleanly.
trap "kill -TERM $DJANGO_PID 2>/dev/null || true" TERM INT

# Start Next.js in the foreground on the public port.
cd frontend-next
exec npx next start -p "${FRONTEND_PORT:-5000}" -H "${FRONTEND_HOST:-0.0.0.0}"
