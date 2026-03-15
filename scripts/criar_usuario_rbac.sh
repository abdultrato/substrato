#!/usr/bin/env bash
set -euo pipefail

# Cria/atualiza um usuário com senha e grupo RBAC (exatos do sistema).
#
# Exemplos:
#   ./scripts/criar_usuario_rbac.sh --list-groups
#   ./scripts/criar_usuario_rbac.sh -u joao -p 'SenhaForte123' -n 'João Paulo' -g MEDICINA --exclusive --reset-password
#
# Notas:
# - A senha fica no histórico do terminal; em produção prefira processos seguros.
# - Apenas o grupo ADMIN tem acesso ao Django Admin (/admin).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

detect_runner() {
  # Default strategy:
  # - Prefer Docker (creates user in the same Postgres used by the stack).
  # - Fall back to local venv (usually SQLite) when Docker isn't available.
  #
  # You can override with: SUBSTRATO_RUNNER=docker|venv|python
  if [[ -n "${SUBSTRATO_RUNNER:-}" ]]; then
    echo "${SUBSTRATO_RUNNER}"
    return
  fi

  if command -v docker >/dev/null 2>&1; then
    if docker compose config -q >/dev/null 2>&1; then
      echo "docker"
      return
    fi
  fi

  if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
    echo "venv"
    return
  fi

  echo "python"
}

usage() {
  cat <<'EOF'
Uso:
  scripts/criar_usuario_rbac.sh --list-groups
  scripts/criar_usuario_rbac.sh -u USERNAME -p PASSWORD -n "NOME COMPLETO" -g GRUPO [opções]

Obrigatório:
  -u, --username        Username (login)
  -p, --password        Senha
  -n, --nome            Nome completo (campo "nome" do usuário)
  -g, --group           Grupo RBAC (chave: ADMIN/RECEPCAO/LABORATORIO/...)

Opcional:
      --email           E-mail (default: <username>@local)
      --first-name      Nome (primeiro nome)
      --last-name       Apelido
      --telefone        Telefone
      --exclusive       Remove outros grupos RBAC e mantém só o informado
      --reset-password  Se usuário existir, redefine a senha

Exemplos:
  scripts/criar_usuario_rbac.sh --list-groups
  scripts/criar_usuario_rbac.sh -u admin -p 'admin123' -n 'Administrador' -g ADMIN --reset-password --exclusive
  scripts/criar_usuario_rbac.sh -u recep1 -p 'Recep#2026' -n 'Maria da Silva' -g RECEPCAO --exclusive --reset-password
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

# Default passthrough args to management command.
ARGS=()

# Simple arg parsing (no getopts to support long args cleanly).
while [[ $# -gt 0 ]]; do
  case "$1" in
    --list-groups)
      ARGS+=("--list-groups")
      shift
      ;;
    -u|--username)
      ARGS+=("--username" "${2:-}")
      shift 2
      ;;
    -p|--password)
      ARGS+=("--password" "${2:-}")
      shift 2
      ;;
    -n|--nome)
      ARGS+=("--nome" "${2:-}")
      shift 2
      ;;
    -g|--group)
      ARGS+=("--group" "${2:-}")
      shift 2
      ;;
    --email)
      ARGS+=("--email" "${2:-}")
      shift 2
      ;;
    --first-name)
      ARGS+=("--first-name" "${2:-}")
      shift 2
      ;;
    --last-name)
      ARGS+=("--last-name" "${2:-}")
      shift 2
      ;;
    --telefone)
      ARGS+=("--telefone" "${2:-}")
      shift 2
      ;;
    --exclusive)
      ARGS+=("--exclusive")
      shift
      ;;
    --reset-password)
      ARGS+=("--reset-password")
      shift
      ;;
    *)
      echo "Argumento desconhecido: $1" >&2
      echo >&2
      usage >&2
      exit 2
      ;;
  esac
done

RUNNER="$(detect_runner)"
case "$RUNNER" in
  docker)
    # Use `run --entrypoint python` to avoid depending on backend container being up
    # and to skip entrypoint.sh side-effects (migrate/collectstatic).
    docker compose run --rm -T --entrypoint python backend manage.py criar_usuario_rbac "${ARGS[@]}"
    ;;
  venv)
    "$ROOT_DIR/.venv/bin/python" manage.py criar_usuario_rbac "${ARGS[@]}"
    ;;
  python)
    python manage.py criar_usuario_rbac "${ARGS[@]}"
    ;;
  *)
    echo "Runner inválido: $RUNNER" >&2
    exit 3
    ;;
esac
