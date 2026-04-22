#!/usr/bin/env bash
set -euo pipefail

# Start Django (gunicorn) on port 8000 in the background.
# Next.js will proxy /api, /admin, /pdf, /static, /media to it.
gunicorn platform.wsgi:application \
  --bind 127.0.0.1:8000 \
  --workers 2 \
  --threads 4 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - &

DJANGO_PID=$!

# Forward signals so the platform can stop both processes cleanly.
trap "kill -TERM $DJANGO_PID 2>/dev/null || true" TERM INT

# Start Next.js in the foreground on the public port.
cd frontend-next
exec npx next start -p 5000 -H 0.0.0.0
