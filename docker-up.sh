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

if ! docker info >/dev/null 2>&1; then
  err "✗ Docker daemon não está rodando"
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

# Habilitar BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Start
log "✓ Iniciando serviços (com build)..."
$COMPOSE up --build -d

# Esperar containers ficarem healthy
log "✓ Aguardando containers..."

for service in db redis backend frontend; do
  echo -n "   → $service "
  ready=false
  status="unknown"
  for i in {1..90}; do
    cid=$($COMPOSE ps -q "$service" 2>/dev/null || true)
    if [[ -z "${cid:-}" ]]; then
      status="missing"
      break
    fi

    status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo "unknown")
    if [[ "$status" == "healthy" || "$status" == "running" ]]; then
      ready=true
      break
    fi
    sleep 1
  done

  if [[ "$ready" == "true" ]]; then
    ok "✓ ($status)"
  elif [[ "$status" == "missing" ]]; then
    err "✗ (container não encontrado)"
  else
    err "✗ (timeout: $status)"
  fi
done

# Status
log "✓ Status dos containers:"
$COMPOSE ps

# Smoke tests (HTTP)
if command -v curl >/dev/null 2>&1; then
  log "✓ Verificando endpoints HTTP..."
  curl -sS -m 6 -o /dev/null -w "   → Backend:  %{http_code} (%{time_total}s)\n" http://localhost:8000/health/live || true
  curl -sS -m 10 -o /dev/null -w "   → Frontend: %{http_code} (%{time_total}s)\n" http://localhost:3000/ || true
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
echo ""

echo -e "${GREEN}Comandos úteis:${NC}"
echo "  Logs:           ${YELLOW}$COMPOSE logs -f${NC}"
echo "  Diagnóstico:    ${YELLOW}./scripts/stack_doctor.sh --fix${NC}"
echo "  Shell Django:   ${YELLOW}$COMPOSE exec backend python manage.py shell${NC}"
echo "  Superuser:      ${YELLOW}$COMPOSE exec backend python manage.py createsuperuser${NC}"
echo "  Parar stack:    ${YELLOW}$COMPOSE down${NC}"
echo ""
