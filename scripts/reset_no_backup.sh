#!/usr/bin/env bash
set -euo pipefail

# Reset TOTAL (DEV) via Docker, SEM BACKUP.
#
# O que faz:
# 1) Apaga migrações locais em apps/*/migrations (exceto __init__.py)
# 2) Drop/Create da base Postgres no container `db`
# 3) Recria migrações e aplica migrate via serviço `backend`
#
# ATENÇÃO: Isto elimina TODOS os dados.
#
# Uso:
#   ./scripts/reset_no_backup.sh
#
# Nota: Este script existe para o caso "sem backup" de forma explícita.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${DJANGO_ENV:-development}" == "production" ]]; then
  echo "Bloqueado: DJANGO_ENV=production. Não execute reset em produção." >&2
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Erro: docker não encontrado." >&2
  exit 2
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "Erro: Docker Compose não encontrado." >&2
  exit 2
fi

if ! $COMPOSE config -q >/dev/null 2>&1; then
  echo "Erro: docker compose indisponível neste diretório." >&2
  exit 2
fi

delete_local_migrations() {
  while IFS= read -r -d '' migdir; do
    find "$migdir" -type f -name "*.py" ! -name "__init__.py" -delete
    find "$migdir" -type f -name "*.pyc" -delete
    find "$migdir" -type d -name "__pycache__" -prune -exec rm -rf {} + 2>/dev/null || true
  done < <(find "$ROOT_DIR/apps" -maxdepth 2 -type d -name migrations -print0)
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
  if docker_running backend; then
    $COMPOSE exec -T backend python manage.py "$@"
  else
    $COMPOSE run --rm -T --entrypoint python backend manage.py "$@"
  fi
}

read_docker_db_env() {
  $COMPOSE exec -T db sh -lc 'printf "%s\n" "${POSTGRES_DB:-}" "${POSTGRES_USER:-}"' 2>/dev/null
}

docker_drop_create() {
  local user="$1"
  local dbname="$2"

  $COMPOSE exec -T db psql -v ON_ERROR_STOP=1 -U "$user" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${dbname}' AND pid <> pg_backend_pid();" \
    >/dev/null 2>&1 || true

  $COMPOSE exec -T db psql -v ON_ERROR_STOP=1 -U "$user" -d postgres -c \
    "DROP DATABASE IF EXISTS \"${dbname}\";" \
    >/dev/null

  $COMPOSE exec -T db psql -v ON_ERROR_STOP=1 -U "$user" -d postgres -c \
    "CREATE DATABASE \"${dbname}\" ENCODING 'UTF8';" \
    >/dev/null
}

echo "RESET TOTAL (SEM BACKUP) - DOCKER - DEV"
echo
echo "Isto vai:"
echo "1) Apagar migrações locais em apps/*/migrations (exceto __init__.py)"
echo "2) Apagar TODOS os dados do Postgres (DROP/CREATE DATABASE)"
echo "3) Recriar migrações e executar migrate"
echo
read -r -p "Digite RESET-SEM-BACKUP para continuar: " CONFIRM
if [[ "$CONFIRM" != "RESET-SEM-BACKUP" ]]; then
  echo "Cancelado."
  exit 0
fi

$COMPOSE up -d db redis >/dev/null

if ! docker_running db; then
  echo "Erro: serviço docker 'db' não está em execução." >&2
  exit 1
fi

mapfile -t DOCKER_DB < <(read_docker_db_env || true)
DOCKER_DB_NAME="${DOCKER_DB[0]:-}"
DOCKER_DB_USER="${DOCKER_DB[1]:-}"

if [[ -z "$DOCKER_DB_NAME" || -z "$DOCKER_DB_USER" ]]; then
  echo "Erro: falha ao ler POSTGRES_DB/POSTGRES_USER do container db." >&2
  exit 1
fi

echo "Apagando migrações locais..."
delete_local_migrations

echo "Apagando banco Postgres (db=${DOCKER_DB_NAME})..."
docker_drop_create "$DOCKER_DB_USER" "$DOCKER_DB_NAME"

echo "Recriando migrações..."
docker_backend_manage makemigrations

echo "Aplicando migrações..."
docker_backend_manage migrate --noinput

echo "OK: banco limpo e migrações recriadas (sem backup)."
