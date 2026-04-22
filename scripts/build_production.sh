#!/usr/bin/env bash
set -euo pipefail

# Python deps + Django build steps.
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate --noinput

# Frontend build.
cd frontend-next
npm ci
npm run build
