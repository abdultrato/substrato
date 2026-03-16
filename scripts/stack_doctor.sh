#!/usr/bin/env bash
set -euo pipefail

# Quick diagnosis/fix helper for the Substrato dev stack.
#
# Usage:
#   ./scripts/stack_doctor.sh
#   ./scripts/stack_doctor.sh --fix
#
# What it does:
# - Checks docker compose services status
# - Pings the main HTTP endpoints (backend/frontend/nginx)
# - Optionally restarts failing services and re-checks

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Uso:
  scripts/stack_doctor.sh [--fix]

Opções:
  --fix   Tenta corrigir automaticamente (restart dos serviços com falha)
  -h      Ajuda
EOF
}

FIX="0"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fix) FIX="1"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opção desconhecida: $1" >&2; usage >&2; exit 2 ;;
  esac
done

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
  echo "Erro: docker compose indisponível neste diretório ($ROOT_DIR)." >&2
  exit 2
fi

has_curl="0"
if command -v curl >/dev/null 2>&1; then
  has_curl="1"
fi

service_status() {
  local svc="$1"
  local cid
  cid="$($COMPOSE ps -q "$svc" 2>/dev/null || true)"
  if [[ -z "${cid:-}" ]]; then
    echo "missing"
    return 0
  fi
  docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo "unknown"
}

check_url() {
  local label="$1"
  local url="$2"
  local timeout="${3:-6}"
  if [[ "$has_curl" != "1" ]]; then
    echo " - $label: curl não disponível (skip)"
    return 0
  fi
  local out
  out="$(curl -sS -m "$timeout" -o /dev/null -w '%{http_code} %{time_total}s' "$url" || true)"
  if [[ "$out" == 2* ]]; then
    echo " - $label: OK ($out)"
    return 0
  fi
  echo " - $label: FAIL ($out) [$url]"
  return 1
}

restart_if_needed() {
  local svc="$1"
  local status
  status="$(service_status "$svc")"
  case "$status" in
    healthy|running) return 0 ;;
  esac

  echo " ! $svc: status=$status"
  if [[ "$FIX" == "1" ]]; then
    echo "   -> restart $svc"
    $COMPOSE restart "$svc" >/dev/null
  fi
  return 1
}

echo "Substrato stack doctor"
echo "Dir: $ROOT_DIR"
echo "Compose: $COMPOSE"
echo

echo "Status:"
$COMPOSE ps
echo

fail="0"

for svc in db redis backend frontend nginx; do
  if ! restart_if_needed "$svc"; then
    fail="1"
  fi
done

echo
echo "HTTP checks:"
backend_ok="1"
frontend_ok="1"
nginx_ok="1"

if ! check_url "Backend /health/live" "http://localhost:8000/health/live" 6; then
  backend_ok="0"
  fail="1"
fi
# Next.js dev (especially first compile) can legitimately take >10s.
if ! check_url "Frontend /" "http://localhost:3000/" 30; then
  frontend_ok="0"
  fail="1"
fi
if ! check_url "Nginx /" "http://localhost/" 30; then
  nginx_ok="0"
  fail="1"
fi

echo
echo "Common issues:"

if [[ "$frontend_ok" == "0" ]]; then
  if $COMPOSE logs --tail=400 frontend 2>/dev/null | grep -q "private-next-instrumentation-client"; then
    echo " - Frontend: Next.js instrumentation hook alias error detectado."
    echo "   Fix: garantir que existe frontend-next/instrumentation-client.ts (stub) e reiniciar o frontend."
    if [[ "$FIX" == "1" && ! -f "$ROOT_DIR/frontend-next/instrumentation-client.ts" ]]; then
      cat >"$ROOT_DIR/frontend-next/instrumentation-client.ts" <<'TS'
/**
 * Next.js client instrumentation hook (stub).
 * Keep this file to prevent: Module not found: private-next-instrumentation-client
 */
export {}
TS
      $COMPOSE restart frontend >/dev/null
    fi
  fi

  if $COMPOSE logs --tail=400 frontend 2>/dev/null | grep -q "Can't resolve '/app/app/globals.css'"; then
    echo " - Frontend: erro ao resolver app/globals.css."
    echo "   Fix: confirmar que frontend-next/app/globals.css existe e reiniciar o frontend."
  fi
fi

if [[ "$backend_ok" == "0" ]]; then
  if $COMPOSE logs --tail=400 backend 2>/dev/null | grep -q "InconsistentMigrationHistory\\|DuplicateColumn"; then
    echo " - Backend: inconsistência de migrations detectada."
    echo "   Fix: scripts/reparar_historico_migracoes_docker.sh"
  fi
fi

echo
if [[ "$fail" == "0" ]]; then
  echo "OK: stack parece saudável."
else
  if [[ "$FIX" == "1" ]]; then
    echo "Verificação final (depois de --fix):"
    $COMPOSE ps
  fi
  echo "Há falhas. Veja logs:"
  echo "  $COMPOSE logs --tail=200 backend"
  echo "  $COMPOSE logs --tail=200 frontend"
  echo "  $COMPOSE logs --tail=200 nginx"
  exit 1
fi
