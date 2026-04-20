#!/usr/bin/env bash
set -euo pipefail

# Repara inconsistências de histórico de migrations no Postgres (DEV).
#
# Contexto:
# - Este projeto teve migrações "squashed"/renomeadas (ex.: 0002_initial).
# - Se você já tinha um banco antigo, o backend pode ficar em loop com:
#   InconsistentMigrationHistory / DuplicateColumn ao executar migrate no entrypoint.
#
# O que este script faz:
# - Marca como "aplicadas" (fake) as migrations iniciais (`0001_initial`/`0002_initial`)
#   presentes no código, inserindo linhas na tabela `django_migrations` quando não existirem.
# - Em seguida executa `manage.py migrate` para validar.
#
# Segurança:
# - Não altera schema diretamente; apenas ajusta o histórico.
# - Se você quiser um reset completo (apaga dados), use:
#   ./scripts/reset_database_and_migrations.sh --docker-db

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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

echo "Reparar histórico de migrations (docker/postgres) - DEV"
echo

$COMPOSE up -d db redis >/dev/null

echo "Aguardando PostgreSQL ficar pronto..."
for _ in $(seq 1 60); do
  if $COMPOSE exec -T db sh -lc 'pg_isready -U "${POSTGRES_USER:-substrato_user}" -d "${POSTGRES_DB:-substrato}"' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! $COMPOSE exec -T db sh -lc 'pg_isready -U "${POSTGRES_USER:-substrato_user}" -d "${POSTGRES_DB:-substrato}"' >/dev/null 2>&1; then
  echo "Erro: PostgreSQL não ficou pronto a tempo." >&2
  exit 1
fi

DB_NAME="$($COMPOSE exec -T db sh -lc 'printf "%s" "${POSTGRES_DB:-substrato}"' 2>/dev/null || true)"
DB_USER="$($COMPOSE exec -T db sh -lc 'printf "%s" "${POSTGRES_USER:-substrato_user}"' 2>/dev/null || true)"

if [[ -z "${DB_NAME:-}" || -z "${DB_USER:-}" ]]; then
  echo "Erro: não foi possível ler POSTGRES_DB/POSTGRES_USER do container db." >&2
  exit 1
fi

echo "DB alvo: ${DB_NAME} (user=${DB_USER})"
echo

resolve_app_label() {
  local app_dir="$1"
  local apps_py="${app_dir}/apps.py"
  local label=""

  if [[ -f "$apps_py" ]]; then
    label="$(sed -nE "s/^[[:space:]]*label[[:space:]]*=[[:space:]]*['\"]([^'\"]+)['\"].*/\1/p" "$apps_py" | head -n 1)"
  fi

  if [[ -n "$label" ]]; then
    echo "$label"
  else
    basename "$app_dir"
  fi
}

mapfile -t MIGS < <(find apps -maxdepth 3 -type f \( -path '*/migrations/0001_initial.py' -o -path '*/migrations/0002_initial.py' \) | sort)
if [[ ${#MIGS[@]} -eq 0 ]]; then
  echo "Nada a fazer: não encontrei migrations iniciais no código."
  exit 0
fi

echo "Marcando migrations iniciais como aplicadas (ON CONFLICT DO NOTHING):"
for f in "${MIGS[@]}"; do
  app_dir="$(echo "$f" | awk -F/ '{print $1 "/" $2}')"
  app_label="$(resolve_app_label "$app_dir")"
  migration_name="$(basename "$f" .py)"
  echo "  - ${app_label}.${migration_name}"
  $COMPOSE exec -T db psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -c \
    "INSERT INTO django_migrations (app,name,applied) VALUES ('${app_label}','${migration_name}', NOW()) ON CONFLICT DO NOTHING;" \
    >/dev/null
done

echo
echo "Validando com migrate..."
$COMPOSE run --rm -T --entrypoint python backend manage.py migrate --noinput

echo
echo "OK: histórico ajustado. Se o backend estava em loop, rode:"
echo "  $COMPOSE up -d backend"
