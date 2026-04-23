#!/usr/bin/env bash
# ============================================================================
# SCRIPT - Encerrar Docker (desenvolvimento)
# ============================================================================

set -euo pipefail

echo "=================================================="
echo "Substrato - Docker Teardown"
echo "=================================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${YELLOW}$1${NC}"; }
ok() { echo -e "${GREEN}$1${NC}"; }
err() { echo -e "${RED}$1${NC}"; }

print_help() {
  cat <<'EOF'
Uso: ./docker-down.sh [opcoes]

Opcoes:
  -v, --volumes            remove volumes do projeto
  --rmi local|all          remove imagens locais (local) ou todas (all)
  --remove-orphans         remove containers orfaos (padrao)
  --no-remove-orphans      nao remove containers orfaos
  --timeout <segundos>     timeout para stop gracioso (padrao: 30)
  -h, --help               mostra esta ajuda

Variaveis de ambiente:
  DOCKER_DOWN_REMOVE_VOLUMES=0|1      (padrao: 0)
  DOCKER_DOWN_REMOVE_ORPHANS=0|1      (padrao: 1)
  DOCKER_DOWN_RMI=none|local|all      (padrao: none)
  DOCKER_DOWN_TIMEOUT=<segundos>      (padrao: 30)
EOF
}

REMOVE_VOLUMES="${DOCKER_DOWN_REMOVE_VOLUMES:-0}"
REMOVE_ORPHANS="${DOCKER_DOWN_REMOVE_ORPHANS:-1}"
RMI_MODE="${DOCKER_DOWN_RMI:-none}"
TIMEOUT="${DOCKER_DOWN_TIMEOUT:-30}"

while (($# > 0)); do
  case "$1" in
  -v|--volumes)
    REMOVE_VOLUMES="1"
    shift
    ;;
  --remove-orphans)
    REMOVE_ORPHANS="1"
    shift
    ;;
  --no-remove-orphans)
    REMOVE_ORPHANS="0"
    shift
    ;;
  --rmi)
    if (($# < 2)); then
      err "✗ --rmi requer valor: local|all"
      exit 1
    fi
    RMI_MODE="$2"
    shift 2
    ;;
  --rmi=*)
    RMI_MODE="${1#*=}"
    shift
    ;;
  --timeout)
    if (($# < 2)); then
      err "✗ --timeout requer um valor numerico"
      exit 1
    fi
    TIMEOUT="$2"
    shift 2
    ;;
  --timeout=*)
    TIMEOUT="${1#*=}"
    shift
    ;;
  -h|--help)
    print_help
    exit 0
    ;;
  *)
    err "✗ Opcao invalida: $1"
    print_help
    exit 1
    ;;
  esac
done

case "$REMOVE_VOLUMES" in
0|1) ;;
*)
  err "✗ DOCKER_DOWN_REMOVE_VOLUMES invalido: $REMOVE_VOLUMES (use 0|1)"
  exit 1
  ;;
esac

case "$REMOVE_ORPHANS" in
0|1) ;;
*)
  err "✗ DOCKER_DOWN_REMOVE_ORPHANS invalido: $REMOVE_ORPHANS (use 0|1)"
  exit 1
  ;;
esac

case "$RMI_MODE" in
none|local|all) ;;
*)
  err "✗ DOCKER_DOWN_RMI invalido: $RMI_MODE (use none|local|all)"
  exit 1
  ;;
esac

if ! [[ "$TIMEOUT" =~ ^[0-9]+$ ]] || [[ "$TIMEOUT" -lt 1 ]]; then
  err "✗ DOCKER_DOWN_TIMEOUT invalido: $TIMEOUT"
  exit 1
fi

# Detectar docker compose moderno
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  err "✗ Docker Compose nao encontrado"
  exit 1
fi

# Verificar Docker
log "✓ Verificando Docker..."
if ! command -v docker >/dev/null; then
  err "✗ Docker nao encontrado"
  exit 1
fi

if ! docker_info_output=$(docker info 2>&1); then
  if grep -qi "permission denied.*docker daemon socket" <<<"$docker_info_output"; then
    err "✗ Sem permissao para acessar o Docker daemon"
    err "  Adicione seu usuario ao grupo docker ou execute com privilegios adequados"
  else
    err "✗ Docker daemon nao esta rodando"
  fi
  exit 1
fi

ok "✓ Docker OK"

down_flags=(down --timeout "$TIMEOUT")

if [[ "$REMOVE_VOLUMES" == "1" ]]; then
  down_flags+=(-v)
fi

if [[ "$REMOVE_ORPHANS" == "1" ]]; then
  down_flags+=(--remove-orphans)
fi

if [[ "$RMI_MODE" != "none" ]]; then
  down_flags+=(--rmi "$RMI_MODE")
fi

log "✓ Encerrando stack..."
$COMPOSE "${down_flags[@]}"

log "✓ Status dos containers:"
$COMPOSE ps || true

echo ""
echo -e "${GREEN}=================================================="
echo "Substrato encerrado."
echo "==================================================${NC}"
echo ""

echo -e "${GREEN}Comandos uteis:${NC}"
echo "  Iniciar stack:  ${YELLOW}./docker-up.sh${NC}"
echo "  Ver logs:       ${YELLOW}$COMPOSE logs -f${NC}"
echo ""
