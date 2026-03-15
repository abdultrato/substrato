#!/usr/bin/env bash
set -euo pipefail

# Backup automatizado do Substrato (DB + media/ opcional).
#
# Seguro por padrão:
# - cria backups com permissões restritas (umask 077)
# - não inclui `.env` (evita vazar segredos)
#
# Suporta:
# - SQLite (copia o ficheiro .sqlite3)
# - Postgres (pg_dump; fallback para docker compose quando necessário)
#
# Uso:
#   ./scripts/backup_automatico.sh
#   ./scripts/backup_automatico.sh --dest backups --keep 14
#   ./scripts/backup_automatico.sh --no-media
#
# Saída:
#   backups/substrato_backup_YYYYmmdd_HHMMSS.tgz  (por padrão)

umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEST_DIR="$ROOT_DIR/backups"
KEEP_COUNT="30"
INCLUDE_MEDIA="1"
FORMAT="tgz" # tgz | dir
NAME_PREFIX="substrato_backup"
FORCE_DOCKER_DB="0"

print_usage() {
  cat <<'USAGE'
Uso: scripts/backup_automatico.sh [opções]

Opções:
  --dest DIR        Diretório onde guardar backups (padrão: ./backups)
  --keep N          Quantidade de backups a manter (padrão: 30)
  --no-media        Não incluir a pasta media/
  --docker-db       Força backup do Postgres via docker compose (serviço "db")
  --format tgz|dir  Salvar em .tgz (padrão) ou diretório
  --name PREFIX     Prefixo do nome do backup (padrão: substrato_backup)
  -h, --help        Ajuda

Notas:
  - Para Postgres, usa pg_dump quando possível. Se falhar e existir docker compose,
    tenta fazer dump via `docker compose exec db pg_dump`.
USAGE
}

while [[ "${1:-}" != "" ]]; do
  case "$1" in
    --dest) DEST_DIR="${2:?}"; shift 2 ;;
    --keep) KEEP_COUNT="${2:?}"; shift 2 ;;
    --no-media) INCLUDE_MEDIA="0"; shift 1 ;;
    --docker-db) FORCE_DOCKER_DB="1"; shift 1 ;;
    --format) FORMAT="${2:?}"; shift 2 ;;
    --name) NAME_PREFIX="${2:?}"; shift 2 ;;
    -h|--help) print_usage; exit 0 ;;
    *) echo "Opção desconhecida: $1" >&2; print_usage; exit 2 ;;
  esac
done

if [[ "$FORMAT" != "tgz" && "$FORMAT" != "dir" ]]; then
  echo "Formato inválido: $FORMAT (use tgz ou dir)" >&2
  exit 2
fi

mkdir -p "$DEST_DIR"

read_docker_db_env() {
  docker compose exec -T db sh -lc 'printf "%s\n" "${POSTGRES_DB:-}" "${POSTGRES_USER:-}" "${POSTGRES_PASSWORD:-}"' 2>/dev/null
}

if [[ "$FORCE_DOCKER_DB" == "1" ]]; then
  if ! command -v docker >/dev/null 2>&1 || ! docker compose ps >/dev/null 2>&1; then
    echo "--docker-db requer docker + docker compose." >&2
    exit 2
  fi

  mapfile -t DOCKER_DB < <(read_docker_db_env || true)
  if [[ -z "${DOCKER_DB[0]:-}" || -z "${DOCKER_DB[1]:-}" ]]; then
    echo "Falha ao ler POSTGRES_DB/POSTGRES_USER do container db. O serviço 'db' está em execução?" >&2
    exit 1
  fi

  DB_ENGINE="postgresql (docker)"
  DB_NAME="${DOCKER_DB[0]}"
  DB_USER="${DOCKER_DB[1]}"
  DB_PASSWORD="${DOCKER_DB[2]:-}"
  DB_HOST="docker:db"
  DB_PORT=""
else
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
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "plataforma.settings")
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
fi

TS="$(date +%Y%m%d_%H%M%S)"
WORK_DIR="$(mktemp -d "${DEST_DIR%/}/.${NAME_PREFIX}_${TS}.XXXXXX")"
OUT_BASENAME="${NAME_PREFIX}_${TS}"
OUT_PATH=""

cleanup() {
  rm -rf "$WORK_DIR" || true
}
trap cleanup EXIT

mkdir -p "$WORK_DIR/meta"

cat >"$WORK_DIR/meta/manifest.txt" <<EOF
created_at=$TS
db_engine=$DB_ENGINE
db_name=$DB_NAME
db_host=$DB_HOST
db_port=$DB_PORT
db_user=$DB_USER
include_media=$INCLUDE_MEDIA
EOF

backup_sqlite() {
  local src="$DB_NAME"
  if [[ -z "$src" ]]; then
    echo "SQLite sem caminho de DB (settings.DATABASES['default']['NAME'])." >&2
    exit 1
  fi
  if [[ ! -f "$src" ]]; then
    echo "SQLite DB não encontrado: $src" >&2
    exit 1
  fi
  mkdir -p "$WORK_DIR/db"
  cp -f "$src" "$WORK_DIR/db/db.sqlite3"
}

try_pg_dump_host() {
  local out="$1"
  if ! command -v pg_dump >/dev/null 2>&1; then
    return 1
  fi
  if [[ -z "$DB_NAME" || -z "$DB_USER" ]]; then
    return 1
  fi
  # Usa formato "custom" para restaurar com pg_restore.
  PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
    -h "${DB_HOST:-localhost}" \
    -p "${DB_PORT:-5432}" \
    -U "$DB_USER" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --file "$out" \
    "$DB_NAME" >/dev/null 2>&1
}

try_pg_dump_docker() {
  local out="$1"
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi
  if ! docker compose ps >/dev/null 2>&1; then
    return 1
  fi
  if ! docker compose ps db >/dev/null 2>&1; then
    return 1
  fi
  if [[ -z "$DB_NAME" || -z "$DB_USER" ]]; then
    return 1
  fi
  # Dump gerado dentro do container db, stream para o host.
  docker compose exec -T db pg_dump -U "$DB_USER" --format=custom --no-owner --no-privileges "$DB_NAME" >"$out" 2>/dev/null
}

backup_postgres() {
  mkdir -p "$WORK_DIR/db"
  local out="$WORK_DIR/db/postgres.dump"

  if try_pg_dump_host "$out"; then
    return 0
  fi

  if try_pg_dump_docker "$out"; then
    return 0
  fi

  echo "Falha ao fazer pg_dump (host e docker). Instale pg_dump ou use docker compose com serviço 'db'." >&2
  exit 1
}

backup_postgres_docker_env() {
  mkdir -p "$WORK_DIR/db"
  local out="$WORK_DIR/db/postgres.dump"

  if ! command -v docker >/dev/null 2>&1 || ! docker compose ps >/dev/null 2>&1; then
    echo "--docker-db requer docker + docker compose." >&2
    exit 2
  fi

  # Dump via variáveis do próprio container db
  docker compose exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" --format=custom --no-owner --no-privileges "$POSTGRES_DB"' >"$out" 2>/dev/null
}

if [[ "$FORCE_DOCKER_DB" == "1" ]]; then
  backup_postgres_docker_env
elif [[ "$DB_ENGINE" == *"sqlite3"* ]]; then
  backup_sqlite
elif [[ "$DB_ENGINE" == *"postgresql"* ]]; then
  backup_postgres
else
  echo "DB engine não suportado: $DB_ENGINE" >&2
  exit 1
fi

try_media_from_docker() {
  # Copia /app/media do serviço backend para o WORK_DIR (mantém a estrutura media/).
  # 1) Preferir exec se o backend já está em execução
  # 2) Fallback: docker compose run com entrypoint tar (não dispara entrypoint.sh)
  if docker compose exec -T backend true >/dev/null 2>&1; then
    docker compose exec -T backend tar -C /app -cf - media 2>/dev/null | tar -C "$WORK_DIR" -xf - 2>/dev/null
    return $?
  fi

  docker compose run --rm -T --entrypoint tar backend -C /app -cf - media 2>/dev/null | tar -C "$WORK_DIR" -xf - 2>/dev/null
}

if [[ "$INCLUDE_MEDIA" == "1" ]]; then
  if [[ "$FORCE_DOCKER_DB" == "1" ]]; then
    mkdir -p "$WORK_DIR/media"
    if ! try_media_from_docker; then
	      # Fallback para media/ local (quando o deploy não usa volume nomeado)
	      rm -rf "${WORK_DIR:?}/media" || true
      if [[ -d "$ROOT_DIR/media" ]]; then
        mkdir -p "$WORK_DIR/media"
        if command -v rsync >/dev/null 2>&1; then
          rsync -a --delete --exclude ".DS_Store" "$ROOT_DIR/media/" "$WORK_DIR/media/"
        else
          cp -a "$ROOT_DIR/media/." "$WORK_DIR/media/"
        fi
      fi
    fi
  elif [[ -d "$ROOT_DIR/media" ]]; then
    mkdir -p "$WORK_DIR/media"
    # rsync preserva permissões/tempos e é mais robusto; fallback para cp.
    if command -v rsync >/dev/null 2>&1; then
      rsync -a --delete --exclude ".DS_Store" "$ROOT_DIR/media/" "$WORK_DIR/media/"
    else
      cp -a "$ROOT_DIR/media/." "$WORK_DIR/media/"
    fi
  fi
fi

# Hashes para integridade
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$WORK_DIR" && find . -type f -print0 | sort -z | xargs -0 sha256sum > meta/SHA256SUMS.txt)
fi

if [[ "$FORMAT" == "dir" ]]; then
  OUT_PATH="$DEST_DIR/$OUT_BASENAME"
  rm -rf "$OUT_PATH" || true
  mv "$WORK_DIR" "$OUT_PATH"
  trap - EXIT
else
  OUT_PATH="$DEST_DIR/$OUT_BASENAME.tgz"
  tar -C "$WORK_DIR" -czf "$OUT_PATH" .
fi

prune_old() {
  local keep="$1"
  local pattern="$2"
  local dir="$3"
  if [[ "$keep" -le 0 ]]; then
    return 0
  fi
  # Ordena por data (mais recentes primeiro) e remove o resto.
  local -a matches=()
  local -a items=()

  shopt -s nullglob
  # We intentionally rely on glob expansion in $pattern here.
  # shellcheck disable=SC2206
  matches=( "$dir"/$pattern )
  shopt -u nullglob

  if [[ "${#matches[@]}" -eq 0 ]]; then
    return 0
  fi

  mapfile -t items < <(ls -1t -- "${matches[@]}" 2>/dev/null || true)
  local i=0
  for item in "${items[@]}"; do
    i=$((i+1))
    if [[ "$i" -le "$keep" ]]; then
      continue
    fi
    rm -rf "$item" || true
  done
}

if [[ "$FORMAT" == "dir" ]]; then
  prune_old "$KEEP_COUNT" "${NAME_PREFIX}_????????_??????" "$DEST_DIR"
else
  prune_old "$KEEP_COUNT" "${NAME_PREFIX}_????????_??????.tgz" "$DEST_DIR"
fi

echo "Backup criado: $OUT_PATH"
