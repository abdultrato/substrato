#!/usr/bin/env bash
set -euo pipefail

# Restore de backup (DB + media) criado por scripts/backup_automatic.sh.
#
# Segurança:
# - Exige confirmação explícita (a menos que --yes)
# - Suporta --dry-run para validação sem alterar dados
#
# Uso:
#   ./scripts/restore_backup.sh --from backups/substrato_backup_YYYYmmdd_HHMMSS.tgz
#   ./scripts/restore_backup.sh --from backups/substrato_backup_YYYYmmdd_HHMMSS --no-media
#   ./scripts/restore_backup.sh --from ... --dry-run

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SRC_PATH=""
INCLUDE_MEDIA="1"
ASSUME_YES="0"
DRY_RUN="0"
FORCE_DOCKER_DB="0"

print_usage() {
  cat <<'USAGE'
Uso: scripts/restore_backup.sh --from ARQUIVO_OU_DIRETORIO [opções]

Opções:
  --from PATH      Backup de origem (.tgz ou diretório)
  --no-media       Não restaurar media/
  --docker-db      Força restore Postgres via docker compose (serviço "db")
  --yes            Não pedir confirmação interativa
  --dry-run        Simula validações sem aplicar alterações
  -h, --help       Ajuda
USAGE
}

while [[ "${1:-}" != "" ]]; do
  case "$1" in
    --from) SRC_PATH="${2:?}"; shift 2 ;;
    --no-media) INCLUDE_MEDIA="0"; shift 1 ;;
    --docker-db) FORCE_DOCKER_DB="1"; shift 1 ;;
    --yes) ASSUME_YES="1"; shift 1 ;;
    --dry-run) DRY_RUN="1"; shift 1 ;;
    -h|--help) print_usage; exit 0 ;;
    *) echo "Opção desconhecida: $1" >&2; print_usage; exit 2 ;;
  esac
done

if [[ -z "$SRC_PATH" ]]; then
  echo "--from é obrigatório." >&2
  print_usage
  exit 2
fi

if [[ ! -f "$SRC_PATH" && ! -d "$SRC_PATH" ]]; then
  echo "Backup não encontrado: $SRC_PATH" >&2
  exit 1
fi

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return 0
  fi
  return 1
}

COMPOSE=""
if command -v docker >/dev/null 2>&1; then
  COMPOSE="$(detect_compose 2>/dev/null || true)"
fi

WORK_DIR=""

cleanup() {
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" ]]; then
    rm -rf "$WORK_DIR" || true
  fi
}
trap cleanup EXIT

prepare_backup_tree() {
  if [[ -d "$SRC_PATH" ]]; then
    WORK_DIR="$SRC_PATH"
    return 0
  fi

  WORK_DIR="$(mktemp -d "${ROOT_DIR%/}/.restore_backup.XXXXXX")"
  tar -C "$WORK_DIR" -xzf "$SRC_PATH"
}

prepare_backup_tree

MANIFEST_FILE="$WORK_DIR/meta/manifest.txt"
if [[ ! -f "$MANIFEST_FILE" ]]; then
  echo "Manifest não encontrado em $MANIFEST_FILE" >&2
  exit 1
fi

BACKUP_DB_ENGINE="$(grep '^db_engine=' "$MANIFEST_FILE" | cut -d= -f2- || true)"
BACKUP_DB_NAME="$(grep '^db_name=' "$MANIFEST_FILE" | cut -d= -f2- || true)"
BACKUP_INCLUDE_MEDIA="$(grep '^include_media=' "$MANIFEST_FILE" | cut -d= -f2- || true)"

PYTHON_BIN=""
if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
  PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
else
  PYTHON_BIN="python"
fi

read_db_settings() {
  "$PYTHON_BIN" - <<'PY'
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "platform.settings")
from django.conf import settings
db = settings.DATABASES.get("default", {})
print(db.get("ENGINE", "") or "")
print(str(db.get("NAME", "") or ""))
print(str(db.get("HOST", "") or ""))
print(str(db.get("PORT", "") or ""))
print(str(db.get("USER", "") or ""))
print(str(db.get("PASSWORD", "") or ""))
PY
}

mapfile -t DB_INFO < <(read_db_settings 2>/dev/null || true)
DB_ENGINE="${DB_INFO[0]:-}"
DB_NAME="${DB_INFO[1]:-}"
DB_HOST="${DB_INFO[2]:-}"
DB_PORT="${DB_INFO[3]:-}"
DB_USER="${DB_INFO[4]:-}"
DB_PASSWORD="${DB_INFO[5]:-}"

if [[ -z "$DB_ENGINE" ]]; then
  echo "Falha ao detectar DB via settings. Verifique ambiente/venv." >&2
  exit 1
fi

HAS_SQLITE_DUMP="0"
HAS_POSTGRES_DUMP="0"
if [[ -f "$WORK_DIR/db/db.sqlite3" ]]; then
  HAS_SQLITE_DUMP="1"
fi
if [[ -f "$WORK_DIR/db/postgres.dump" ]]; then
  HAS_POSTGRES_DUMP="1"
fi

if [[ "$HAS_SQLITE_DUMP" != "1" && "$HAS_POSTGRES_DUMP" != "1" ]]; then
  echo "Backup sem payload de DB (esperado: db/db.sqlite3 ou db/postgres.dump)." >&2
  exit 1
fi

echo "Resumo do restore:"
echo "  origem:           $SRC_PATH"
echo "  backup db_engine: ${BACKUP_DB_ENGINE:-desconhecido}"
echo "  backup db_name:   ${BACKUP_DB_NAME:-desconhecido}"
echo "  runtime db:       $DB_ENGINE (name=$DB_NAME host=$DB_HOST port=$DB_PORT user=$DB_USER)"
echo "  restore media:    $INCLUDE_MEDIA (backup include_media=${BACKUP_INCLUDE_MEDIA:-?})"
echo "  dry-run:          $DRY_RUN"

if [[ "$ASSUME_YES" != "1" ]]; then
  echo
  read -r -p "Digite RESTORE para continuar: " CONFIRM
  if [[ "$CONFIRM" != "RESTORE" ]]; then
    echo "Cancelado."
    exit 0
  fi
fi

restore_sqlite() {
  local src="$WORK_DIR/db/db.sqlite3"
  local dst="$DB_NAME"
  if [[ -z "$dst" ]]; then
    echo "SQLite sem caminho de DB em settings." >&2
    exit 1
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] copiar $src -> $dst"
    return 0
  fi

  mkdir -p "$(dirname "$dst")"
  if [[ -f "$dst" ]]; then
    cp -f "$dst" "${dst}.pre_restore.$(date +%Y%m%d_%H%M%S)"
  fi
  cp -f "$src" "$dst"
}

restore_postgres_host() {
  local dump_file="$WORK_DIR/db/postgres.dump"
  if ! command -v pg_restore >/dev/null 2>&1; then
    return 1
  fi
  if [[ -z "$DB_NAME" || -z "$DB_USER" ]]; then
    return 1
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] pg_restore -> db=$DB_NAME host=${DB_HOST:-localhost} port=${DB_PORT:-5432} user=$DB_USER"
    return 0
  fi

  PGPASSWORD="${DB_PASSWORD:-}" pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    -h "${DB_HOST:-localhost}" \
    -p "${DB_PORT:-5432}" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    "$dump_file"
}

restore_postgres_docker() {
  local dump_file="$WORK_DIR/db/postgres.dump"
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi
  if [[ -z "${COMPOSE:-}" ]] || ! $COMPOSE ps >/dev/null 2>&1; then
    return 1
  fi
  if ! $COMPOSE ps db >/dev/null 2>&1; then
    return 1
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] docker pg_restore no serviço db"
    return 0
  fi

  cat "$dump_file" | $COMPOSE exec -T db sh -lc 'pg_restore --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

restore_db() {
  if [[ "$HAS_SQLITE_DUMP" == "1" ]]; then
    restore_sqlite
    return 0
  fi

  if [[ "$FORCE_DOCKER_DB" == "1" ]]; then
    restore_postgres_docker && return 0
    echo "Falha no restore postgres via docker." >&2
    exit 1
  fi

  restore_postgres_host && return 0
  restore_postgres_docker && return 0

  echo "Falha ao restaurar Postgres (host e docker)." >&2
  exit 1
}

restore_media() {
  if [[ "$INCLUDE_MEDIA" != "1" ]]; then
    echo "Restore de media desativado (--no-media)."
    return 0
  fi

  if [[ ! -d "$WORK_DIR/media" ]]; then
    echo "Backup sem pasta media/; nada a restaurar."
    return 0
  fi

  local target="$ROOT_DIR/media"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] sincronizar $WORK_DIR/media -> $target"
    return 0
  fi

  mkdir -p "$target"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete --exclude ".DS_Store" "$WORK_DIR/media/" "$target/"
  else
    rm -rf "${target:?}/"* || true
    cp -a "$WORK_DIR/media/." "$target/"
  fi
}

restore_db
restore_media

echo "Restore concluído com sucesso."
