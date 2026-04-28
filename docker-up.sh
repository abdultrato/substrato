#!/usr/bin/env bash
# ============================================================================
# SCRIPT - Inicializar Docker (desenvolvimento)
# ============================================================================

set -euo pipefail

echo "=================================================="
echo "🐳 Substrato - Docker Setup"
echo "=================================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${YELLOW}$1${NC}"; }
ok() { echo -e "${GREEN}$1${NC}"; }
err() { echo -e "${RED}$1${NC}"; }

port_in_use() {
  local port="$1"
  ss -ltn "( sport = :${port} )" 2>/dev/null | tail -n +2 | grep -q .
}

find_free_port() {
  local port="$1"
  while port_in_use "$port"; do
    port=$((port + 1))
  done
  echo "$port"
}

load_env_value() {
  local key="$1"
  local file="$2"

  if [[ -f "$file" ]]; then
    grep -E "^${key}=" "$file" | tail -n 1 | cut -d= -f2- || true
  fi
}

current_compose_port() {
  local service="$1"
  local container_port="$2"
  local cid=""

  cid=$($COMPOSE ps -q "$service" 2>/dev/null || true)
  if [[ -z "${cid:-}" ]]; then
    return 0
  fi

  docker port "$cid" "$container_port" 2>/dev/null | awk -F: 'NR == 1 {print $NF}'
}

service_runtime_status() {
  local service="$1"
  local cid=""
  local status=""

  cid=$($COMPOSE ps -q "$service" 2>/dev/null || true)
  if [[ -z "${cid:-}" ]]; then
    echo "missing"
    return 0
  fi

  status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo "unknown")
  echo "$status"
}

service_is_ready() {
  local service="$1"
  local status=""
  status="$(service_runtime_status "$service")"
  [[ "$status" == "healthy" || "$status" == "running" ]]
}

all_core_services_ready() {
  local services=(db redis backend frontend)
  local service
  for service in "${services[@]}"; do
    if ! service_is_ready "$service"; then
      return 1
    fi
  done
  return 0
}

print_help() {
  cat <<'EOF'
Uso: ./docker-up.sh [opções]

Opções:
  --force-up   força executar `compose up` mesmo com stack já saudável
  --build      força rebuild das imagens
  --no-build   nunca tenta build (falha se imagem não existir)
  --no-wait    não aguarda healthcheck/estado running
  -h, --help   mostra esta ajuda

Variáveis de ambiente:
  DOCKER_UP_BUILD=auto|always|never   (padrão: auto)
  DOCKER_UP_FAST_IF_RUNNING=0|1       (padrão: 1)
  DOCKER_UP_NO_WAIT=0|1               (padrão: 0)
  DOCKER_UP_WAIT_TIMEOUT=<segundos>   (padrão: 90)
  DOCKER_UP_FRONTEND_READY_PATH=<rota> (padrão: /login/)
  DOCKER_UP_FRONTEND_TIMEOUT=<segundos> (padrão: 12)
  DB_HOST_PORT=<porta>                (expõe o Postgres no host)
  REDIS_HOST_PORT=<porta>             (expõe o Redis no host)
EOF
}

BUILD_MODE="${DOCKER_UP_BUILD:-auto}"
FAST_IF_RUNNING="${DOCKER_UP_FAST_IF_RUNNING:-1}"
NO_WAIT="${DOCKER_UP_NO_WAIT:-0}"
WAIT_TIMEOUT="${DOCKER_UP_WAIT_TIMEOUT:-90}"
FRONTEND_READY_PATH="${DOCKER_UP_FRONTEND_READY_PATH:-/login/}"
FRONTEND_TIMEOUT="${DOCKER_UP_FRONTEND_TIMEOUT:-12}"
FORCE_UP=0

for arg in "$@"; do
  case "$arg" in
  --force-up)
    FORCE_UP=1
    ;;
  --build)
    BUILD_MODE="always"
    ;;
  --no-build)
    BUILD_MODE="never"
    ;;
  --no-wait)
    NO_WAIT="1"
    ;;
  -h|--help)
    print_help
    exit 0
    ;;
  *)
    err "✗ Opção inválida: $arg"
    print_help
    exit 1
    ;;
  esac
done

if [[ "$BUILD_MODE" != "auto" && "$BUILD_MODE" != "always" && "$BUILD_MODE" != "never" ]]; then
  err "✗ DOCKER_UP_BUILD inválido: $BUILD_MODE (use auto|always|never)"
  exit 1
fi

if [[ "$FAST_IF_RUNNING" != "0" && "$FAST_IF_RUNNING" != "1" ]]; then
  err "✗ DOCKER_UP_FAST_IF_RUNNING inválido: $FAST_IF_RUNNING (use 0|1)"
  exit 1
fi

if ! [[ "$WAIT_TIMEOUT" =~ ^[0-9]+$ ]] || [[ "$WAIT_TIMEOUT" -lt 1 ]]; then
  err "✗ DOCKER_UP_WAIT_TIMEOUT inválido: $WAIT_TIMEOUT"
  exit 1
fi

if ! [[ "$FRONTEND_TIMEOUT" =~ ^[0-9]+$ ]] || [[ "$FRONTEND_TIMEOUT" -lt 1 ]]; then
  err "✗ DOCKER_UP_FRONTEND_TIMEOUT inválido: $FRONTEND_TIMEOUT"
  exit 1
fi

# Detectar docker compose moderno
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  err "✗ Docker Compose não encontrado"
  exit 1
fi

# Verificar Docker
log "✓ Verificando Docker..."
if ! command -v docker >/dev/null; then
  err "✗ Docker não encontrado"
  exit 1
fi

if ! docker_info_output=$(docker info 2>&1); then
  if grep -qi "permission denied.*docker daemon socket" <<<"$docker_info_output"; then
    err "✗ Sem permissão para acessar o Docker daemon"
    err "  Adicione seu usuário ao grupo docker ou execute com privilégios adequados"
  else
    err "✗ Docker daemon não está rodando"
  fi
  exit 1
fi

ok "✓ Docker OK"

# Criar .env
if [ ! -f .env ]; then
  log "✓ Criando arquivo .env..."
  cp .env.docker .env
  ok "✓ .env criado"
else
  log "ℹ️  .env já existe"
fi

if [[ -n "${DB_HOST_PORT:-}" ]]; then
  requested_db_host_port="$DB_HOST_PORT"
  db_host_port_explicit=1
else
  requested_db_host_port="$(load_env_value "DB_HOST_PORT" ".env")"
  db_host_port_explicit=0
fi

if [[ -z "$requested_db_host_port" ]]; then
  requested_db_host_port="5432"
fi

if ((db_host_port_explicit)); then
  if port_in_use "$requested_db_host_port"; then
    err "✗ DB_HOST_PORT=${requested_db_host_port} já está em uso no host"
    err "  Defina outra porta em .env ou no ambiente e execute novamente"
    exit 1
  fi
  export DB_HOST_PORT="$requested_db_host_port"
else
  current_db_host_port="$(current_compose_port "db" "5432/tcp")"
  if [[ -n "${current_db_host_port:-}" ]]; then
    export DB_HOST_PORT="$current_db_host_port"
    log "ℹ️  Reutilizando porta atual do PostgreSQL: localhost:${DB_HOST_PORT}"
  elif port_in_use "$requested_db_host_port"; then
    export DB_HOST_PORT="$(find_free_port 5433)"
    log "ℹ️  Porta 5432 ocupada; PostgreSQL será exposto em localhost:${DB_HOST_PORT}"
  else
    export DB_HOST_PORT="$requested_db_host_port"
  fi
fi

log "✓ PostgreSQL no host: localhost:${DB_HOST_PORT}"

if [[ -n "${REDIS_HOST_PORT:-}" ]]; then
  requested_redis_host_port="$REDIS_HOST_PORT"
  redis_host_port_explicit=1
else
  requested_redis_host_port="$(load_env_value "REDIS_HOST_PORT" ".env")"
  redis_host_port_explicit=0
fi

if [[ -z "$requested_redis_host_port" ]]; then
  requested_redis_host_port="6379"
fi

if ((redis_host_port_explicit)); then
  if port_in_use "$requested_redis_host_port"; then
    err "✗ REDIS_HOST_PORT=${requested_redis_host_port} já está em uso no host"
    err "  Defina outra porta em .env ou no ambiente e execute novamente"
    exit 1
  fi
  export REDIS_HOST_PORT="$requested_redis_host_port"
else
  current_redis_host_port="$(current_compose_port "redis" "6379/tcp")"
  if [[ -n "${current_redis_host_port:-}" ]]; then
    export REDIS_HOST_PORT="$current_redis_host_port"
    log "ℹ️  Reutilizando porta atual do Redis: localhost:${REDIS_HOST_PORT}"
  elif port_in_use "$requested_redis_host_port"; then
    export REDIS_HOST_PORT="$(find_free_port 6380)"
    log "ℹ️  Porta 6379 ocupada; Redis será exposto em localhost:${REDIS_HOST_PORT}"
  else
    export REDIS_HOST_PORT="$requested_redis_host_port"
  fi
fi

log "✓ Redis no host: localhost:${REDIS_HOST_PORT}"

# Habilitar BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Iniciar stack
up_flags=(-d)

case "$BUILD_MODE" in
auto)
  log "✓ Build mode: auto (sem rebuild forçado)"
  ;;
always)
  up_flags+=(--build)
  log "✓ Build mode: always (--build)"
  ;;
never)
  up_flags+=(--no-build)
  log "✓ Build mode: never (--no-build)"
  ;;
esac

did_compose_up=1

if [[ "$FORCE_UP" == "0" && "$FAST_IF_RUNNING" == "1" && "$BUILD_MODE" != "always" ]] && all_core_services_ready; then
  did_compose_up=0
  log "ℹ️  Stack já está saudável; pulando \`compose up\` (use --force-up para forçar)."
fi

if [[ "$did_compose_up" == "1" ]]; then
  if [[ "$NO_WAIT" == "1" ]]; then
    log "✓ Iniciando serviços (sem espera)..."
    $COMPOSE up "${up_flags[@]}"
  else
    log "✓ Iniciando serviços..."
    $COMPOSE up "${up_flags[@]}"
  fi
fi

if [[ "$NO_WAIT" != "1" ]]; then
  log "✓ Aguardando containers (timeout: ${WAIT_TIMEOUT}s)..."
  services=(db redis backend frontend)
  declare -A service_ready service_status
  deadline=$((SECONDS + WAIT_TIMEOUT))

  for service in "${services[@]}"; do
    service_ready["$service"]="0"
    service_status["$service"]="unknown"
  done

  while ((SECONDS < deadline)); do
    pending=0
    for service in "${services[@]}"; do
      if [[ "${service_ready[$service]}" == "1" ]]; then
        continue
      fi

      cid=$($COMPOSE ps -q "$service" 2>/dev/null || true)
      if [[ -z "${cid:-}" ]]; then
        service_status["$service"]="missing"
        pending=$((pending + 1))
        continue
      fi

      status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo "unknown")
      service_status["$service"]="$status"
      if [[ "$status" == "healthy" || "$status" == "running" ]]; then
        service_ready["$service"]="1"
      else
        pending=$((pending + 1))
      fi
    done

    if ((pending == 0)); then
      break
    fi
    sleep 1
  done

  for service in "${services[@]}"; do
    echo -n "   → $service "
    if [[ "${service_ready[$service]}" == "1" ]]; then
      ok "✓ (${service_status[$service]})"
    elif [[ "${service_status[$service]}" == "missing" ]]; then
      err "✗ (container não encontrado)"
    else
      err "✗ (timeout: ${service_status[$service]})"
    fi
  done
fi

# Status
log "✓ Status dos containers:"
$COMPOSE ps

# Smoke tests (HTTP)
if command -v curl >/dev/null 2>&1; then
  log "✓ Verificando endpoints HTTP..."
  curl -sS -m 6 -o /dev/null -w "   → Backend:  %{http_code} (%{time_total}s)\n" http://localhost:8000/health/live || true
  curl -sS -m "$FRONTEND_TIMEOUT" -o /dev/null -w "   → Frontend: %{http_code} (%{time_total}s)\n" "http://localhost:3000${FRONTEND_READY_PATH}" || true
  curl -sS -m 10 -o /dev/null -w "   → Nginx:    %{http_code} (%{time_total}s)\n" http://localhost/ || true
else
  log "ℹ️  curl não encontrado; pulando smoke tests."
fi

echo ""
echo -e "${GREEN}=================================================="
echo "✅ Substrato iniciado!"
echo "==================================================${NC}"
echo ""

echo -e "${GREEN}URLs:${NC}"
echo "  • Backend:  ${YELLOW}http://localhost:8000${NC}"
echo "  • Admin:    ${YELLOW}http://localhost:8000/admin${NC}"
echo "  • Frontend: ${YELLOW}http://localhost:3000${NC}"
echo "  • Nginx:    ${YELLOW}http://localhost${NC}"
echo "  • PostgreSQL:${YELLOW} localhost:${DB_HOST_PORT}${NC}"
echo ""

echo -e "${GREEN}Comandos úteis:${NC}"
echo "  Logs:           ${YELLOW}$COMPOSE logs -f${NC}"
echo "  Diagnóstico:    ${YELLOW}./scripts/stack_doctor.sh --fix${NC}"
echo "  Rebuild total:  ${YELLOW}./docker-up.sh --build${NC}"
echo "  Shell Django:   ${YELLOW}$COMPOSE exec backend python manage.py shell${NC}"
echo "  Superuser:      ${YELLOW}$COMPOSE exec backend python manage.py createsuperuser${NC}"
echo "  Parar stack:    ${YELLOW}$COMPOSE down${NC}"
echo ""
