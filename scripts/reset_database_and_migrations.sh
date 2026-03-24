#!/usr/bin/env bash
set -euo pipefail

# Reset completo (DEV): apaga DB + apaga migrações locais + recria migrações + migra.
#
# ATENÇÃO:
# - Isto elimina TODOS os dados do banco.
# - Reescrever migrações é adequado apenas para desenvolvimento local.
#
# Uso:
#   ./scripts/reset_database_and_migrations.sh
#   ./scripts/reset_database_and_migrations.sh --no-backup
#   ./scripts/reset_database_and_migrations.sh --docker-db   # força reset do Postgres via docker compose (serviço "db")
#
# Segurança:
# - Bloqueia execução quando DJANGO_ENV=production (a menos que você force).
# - Exige confirmação digitando "RESET".

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

detect_compose() {
  # Prefer modern plugin (`docker compose`), but fall back to legacy `docker-compose`.
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

NO_BACKUP="0"
FORCE_DOCKER_DB="0"
FORCE="0"

print_usage() {
  cat <<'USAGE'
Uso: scripts/reset_database_and_migrations.sh [opções]

Opções:
  --no-backup     Não faz backup antes de apagar
  --docker-db     Força reset do Postgres via docker compose (serviço "db" + migrações pelo serviço "backend")
  --force         Permite rodar mesmo com DJANGO_ENV=production (não recomendado)
  -h, --help      Ajuda

Exemplos:
  ./scripts/reset_database_and_migrations.sh
  ./scripts/reset_database_and_migrations.sh --docker-db
USAGE
}

while [[ "${1:-}" != "" ]]; do
  case "$1" in
    --no-backup) NO_BACKUP="1"; shift 1 ;;
    --docker-db) FORCE_DOCKER_DB="1"; shift 1 ;;
    --force) FORCE="1"; shift 1 ;;
    -h|--help) print_usage; exit 0 ;;
    *) echo "Opção desconhecida: $1" >&2; print_usage; exit 2 ;;
  esac
done

DJANGO_ENV_VAL="${DJANGO_ENV:-development}"
if [[ "$DJANGO_ENV_VAL" == "production" && "$FORCE" != "1" ]]; then
  echo "Bloqueado: DJANGO_ENV=production. Use --force se realmente souber o que está a fazer." >&2
  exit 2
fi

if [[ ! -f "$ROOT_DIR/manage.py" ]]; then
  echo "manage.py não encontrado em $ROOT_DIR" >&2
  exit 1
fi

TS="$(date +%Y%m%d_%H%M%S)"

backup_migrations_tar() {
  mkdir -p "$ROOT_DIR/backups"
  tar -czf "$ROOT_DIR/backups/migrations_pre_reset_${TS}.tgz" -C "$ROOT_DIR" apps/*/migrations >/dev/null 2>&1 || true
}

delete_local_migrations() {
  while IFS= read -r -d '' migdir; do
    find "$migdir" -type f -name "*.py" ! -name "__init__.py" -delete
    find "$migdir" -type f -name "*.pyc" -delete
    find "$migdir" -type d -name "__pycache__" -prune -exec rm -rf {} + 2>/dev/null || true
  done < <(find "$ROOT_DIR/apps" -maxdepth 2 -type d -name migrations -print0)
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker não encontrado. Instale docker para usar --docker-db." >&2
    exit 2
  fi
  if [[ -z "${COMPOSE:-}" ]] || ! $COMPOSE ps >/dev/null 2>&1; then
    echo "docker compose indisponível neste diretório. Execute a partir da raiz do projeto." >&2
    exit 2
  fi
}

docker_running() {
  local svc="$1"
  local cid
  cid="$($COMPOSE ps -q "$svc" 2>/dev/null || true)"
  if [[ -z "$cid" ]]; then
    return 1
  fi
  docker inspect -f '{{.State.Running}}' "$cid" 2>/dev/null | grep -q true
}

docker_backend_manage() {
  # Executa `python manage.py ...` no serviço backend.
  # Preferimos `exec` quando o backend já está a correr. Em fallback, usamos
  # `run --entrypoint python` para não disparar o entrypoint.sh (mais rápido
  # e evita side-effects como collectstatic automático).
  if docker_running backend; then
    $COMPOSE exec -T backend python manage.py "$@"
  else
    $COMPOSE run --rm -T --entrypoint python backend manage.py "$@"
  fi
}

read_docker_db_env() {
  $COMPOSE exec -T db sh -lc 'printf "%s\n" "${POSTGRES_DB:-}" "${POSTGRES_USER:-}" "${POSTGRES_PASSWORD:-}"' 2>/dev/null
}

docker_drop_create() {
  local user="$1"
  local dbname="$2"
  $COMPOSE exec -T db psql -v ON_ERROR_STOP=1 -U "$user" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${dbname}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
  $COMPOSE exec -T db psql -v ON_ERROR_STOP=1 -U "$user" -d postgres -c "DROP DATABASE IF EXISTS \"${dbname}\";" >/dev/null
  $COMPOSE exec -T db psql -v ON_ERROR_STOP=1 -U "$user" -d postgres -c "CREATE DATABASE \"${dbname}\" ENCODING 'UTF8';" >/dev/null
}

if [[ "$FORCE_DOCKER_DB" == "1" ]]; then
  require_docker

  if ! docker_running db; then
    echo "Serviço docker 'db' não está em execução. Rode: docker compose up -d db" >&2
    exit 1
  fi

  mapfile -t DOCKER_DB < <(read_docker_db_env || true)
  DOCKER_DB_NAME="${DOCKER_DB[0]:-}"
  DOCKER_DB_USER="${DOCKER_DB[1]:-}"

  if [[ -z "$DOCKER_DB_NAME" || -z "$DOCKER_DB_USER" ]]; then
    echo "Falha ao ler POSTGRES_DB/POSTGRES_USER do container db." >&2
    exit 1
  fi

  echo "Vai executar RESET COMPLETO (DEV) em: $ROOT_DIR"
  echo "Modo: docker compose (db=$DOCKER_DB_NAME user=$DOCKER_DB_USER)"
  echo
  echo "Isto vai:"
  echo "1) Fazer backup (a menos que --no-backup)"
  echo "2) Apagar migrações locais em apps/*/migrations (exceto __init__.py)"
  echo "3) Drop/Create do banco Postgres no container db"
  echo "4) Recriar migrações e executar migrate via serviço backend"
  echo
  read -r -p "Digite RESET para continuar: " CONFIRM
  if [[ "$CONFIRM" != "RESET" ]]; then
    echo "Cancelado."
    exit 0
  fi

  if [[ "$NO_BACKUP" != "1" ]]; then
    echo "Criando backup antes do reset (docker)..."
    "$ROOT_DIR/scripts/backup_automatico.sh" --dest "$ROOT_DIR/backups" --keep 30 --docker-db >/dev/null
    echo "Backup OK."
  fi

  echo "Guardando cópia das migrações atuais (tar.gz)..."
  backup_migrations_tar

  echo "Apagando migrações locais..."
  delete_local_migrations

  echo "Apagando banco (docker db)..."
  docker_drop_create "$DOCKER_DB_USER" "$DOCKER_DB_NAME"

  echo "Recriando migrações (docker backend)..."
  docker_backend_manage makemigrations

  echo "Aplicando migrações (docker backend)..."
  docker_backend_manage migrate

  echo "OK: banco limpo e migrações recriadas (docker)."
  exit 0
fi

# ======================================================================
# MODO LOCAL (host): detecta DB via settings e executa manage.py no host
# ======================================================================

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

echo "Vai executar RESET COMPLETO (DEV) em: $ROOT_DIR"
echo "DB detectado: $DB_ENGINE (NAME=$DB_NAME HOST=$DB_HOST PORT=$DB_PORT USER=$DB_USER)"
echo
echo "Isto vai:"
echo "1) Fazer backup (a menos que --no-backup)"
echo "2) Apagar migrações locais em apps/*/migrations (exceto __init__.py)"
echo "3) Apagar o banco (SQLite: remove ficheiro; Postgres: drop/create database)"
echo "4) Recriar migrações e executar migrate"
echo
read -r -p "Digite RESET para continuar: " CONFIRM
if [[ "$CONFIRM" != "RESET" ]]; then
  echo "Cancelado."
  exit 0
fi

if [[ "$NO_BACKUP" != "1" ]]; then
  echo "Criando backup antes do reset..."
  "$ROOT_DIR/scripts/backup_automatico.sh" --dest "$ROOT_DIR/backups" --keep 30 >/dev/null
  echo "Backup OK."
fi

echo "Guardando cópia das migrações atuais (tar.gz)..."
backup_migrations_tar

echo "Apagando migrações locais..."
delete_local_migrations

reset_sqlite() {
  local path="$DB_NAME"
  if [[ -z "$path" ]]; then
    echo "SQLite sem caminho de DB (settings.DATABASES['default']['NAME'])." >&2
    exit 1
  fi
  echo "Removendo SQLite: $path"
  rm -f "$path" "$path-journal" "$path-wal" "$path-shm" 2>/dev/null || true
}

psql_drop_create() {
  local host="$1"
  local port="$2"
  local user="$3"
  local pass="$4"
  local dbname="$5"

  if ! command -v psql >/dev/null 2>&1; then
    return 1
  fi

  local psql_base=(psql -v ON_ERROR_STOP=1 -h "$host" -p "$port" -U "$user")
  PGPASSWORD="$pass" "${psql_base[@]}" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${dbname}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
  PGPASSWORD="$pass" "${psql_base[@]}" -d postgres -c "DROP DATABASE IF EXISTS \"${dbname}\";" >/dev/null
  PGPASSWORD="$pass" "${psql_base[@]}" -d postgres -c "CREATE DATABASE \"${dbname}\" ENCODING 'UTF8';" >/dev/null
}

reset_postgres() {
  if [[ -z "$DB_NAME" || -z "$DB_USER" ]]; then
    echo "Postgres: faltam DB_NAME/DB_USER nos settings." >&2
    exit 1
  fi
  echo "Reset Postgres: drop/create database $DB_NAME"

  # Tenta host psql primeiro
  if psql_drop_create "${DB_HOST:-localhost}" "${DB_PORT:-5432}" "$DB_USER" "${DB_PASSWORD:-}" "$DB_NAME"; then
    return 0
  fi

  # Fallback: docker compose (caso você esteja a usar docker, mas o host não alcança o DB)
  if command -v docker >/dev/null 2>&1 && [[ -n "${COMPOSE:-}" ]] && $COMPOSE ps >/dev/null 2>&1; then
    docker_drop_create "$DB_USER" "$DB_NAME" && return 0
  fi

  echo "Falha ao resetar Postgres (psql e docker). Use --docker-db se estiver a usar docker compose." >&2
  exit 1
}

echo "Apagando banco..."
if [[ "$DB_ENGINE" == *"sqlite3"* ]]; then
  reset_sqlite
elif [[ "$DB_ENGINE" == *"postgresql"* ]]; then
  reset_postgres
else
  echo "DB engine não suportado: $DB_ENGINE" >&2
  exit 1
fi

echo "Recriando migrações..."
"$PYTHON_BIN" "$ROOT_DIR/manage.py" makemigrations

echo "Aplicando migrações..."
"$PYTHON_BIN" "$ROOT_DIR/manage.py" migrate

echo "OK: banco limpo e migrações recriadas."

