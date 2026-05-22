#!/usr/bin/env bash
set -euo pipefail

# Python deps + Django build steps.
pip install -r requirements.txt
python manage.py collectstatic --noinput
# Migrações saem do build e entram no startup/deploy gate (scripts/start_production.sh)
# para evitar acoplamento com disponibilidade de banco durante a fase de build.

# Frontend build.
cd frontend-next
npm ci
npm run build
