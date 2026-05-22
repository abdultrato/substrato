#!/usr/bin/env bash
set -euo pipefail

# Compatibilidade de naming:
# scripts legados e runbooks antigos referenciam backup_automatico.sh.
# O script oficial permanece em backup_automatic.sh.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "$ROOT_DIR/scripts/backup_automatic.sh" "$@"
