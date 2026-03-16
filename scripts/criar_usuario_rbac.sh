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
    if [[ -n "${COMPOSE:-}" ]] && $COMPOSE config -q >/dev/null 2>&1; then
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
  scripts/criar_usuario_rbac.sh --wizard
  scripts/criar_usuario_rbac.sh -u USERNAME -p PASSWORD -n "NOME COMPLETO" -g GRUPO [opções]

Modo interativo (recomendado):
  Se você executar sem argumentos, o script entra em modo interativo e guia a criação.

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

RUNNER="$(detect_runner)"

run_manage() {
  case "$RUNNER" in
    docker)
      # Use `run --entrypoint python` to avoid depending on backend container being up
      # and to skip entrypoint.sh side-effects (migrate/collectstatic).
      $COMPOSE run --rm -T --entrypoint python backend manage.py "$@"
      ;;
    venv)
      "$ROOT_DIR/.venv/bin/python" manage.py "$@"
      ;;
    python)
      python manage.py "$@"
      ;;
    *)
      echo "Runner inválido: $RUNNER" >&2
      exit 3
      ;;
  esac
}

trim() {
  # Usage: trim "  a  " -> "a"
  local s="${1:-}"
  # shellcheck disable=SC2001
  echo "$(echo "$s" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/[[:space:]]\\{2,\\}/ /g')"
}

wizard_create_user() {
  # Wizard requirements requested by the user:
  # 1) show groups as 1..N for selection
  # 2) prompt: username -> password -> first_name -> last_name
  # 3) create the user at the end

  local -a GROUP_KEYS=(
    "ADMIN"
    "RECEPCAO"
    "LABORATORIO"
    "ENFERMAGEM"
    "MEDICINA"
    "MEDICINA_OCUPACIONAL"
    "FARMACIA"
    "CONTABILIDADE"
    "RECURSOS_HUMANOS"
  )
  local -a GROUP_LABELS=(
    "Administrador"
    "Recepcionista"
    "Técnico de Laboratório"
    "Enfermeiro"
    "Médico"
    "Medicina Ocupacional"
    "Técnico de Farmácia"
    "Contabilidade"
    "Gestor de RH"
  )

  echo
  echo "Criacao de utilizador (RBAC) - modo interativo"
  echo "Runner: $RUNNER"
  echo
  echo "Grupos disponiveis:"
  local i
  for i in "${!GROUP_KEYS[@]}"; do
    local n=$((i + 1))
    echo "  ${n}. ${GROUP_KEYS[$i]} - ${GROUP_LABELS[$i]}"
  done

  local choice="" group_key="" group_label=""
  while [[ -z "$group_key" ]]; do
    read -r -p "Escolha o grupo (1-${#GROUP_KEYS[@]}): " choice
    choice="$(trim "$choice")"
    choice="${choice// /}"
    if [[ "$choice" =~ ^[0-9]+$ ]]; then
      local idx=$((choice - 1))
      if (( idx >= 0 && idx < ${#GROUP_KEYS[@]} )); then
        group_key="${GROUP_KEYS[$idx]}"
        group_label="${GROUP_LABELS[$idx]}"
        break
      fi
    else
      local upper="${choice^^}"
      for i in "${!GROUP_KEYS[@]}"; do
        if [[ "${GROUP_KEYS[$i]}" == "$upper" ]]; then
          group_key="${GROUP_KEYS[$i]}"
          group_label="${GROUP_LABELS[$i]}"
          break
        fi
      done
    fi
    if [[ -z "$group_key" ]]; then
      echo "Opcao invalida. Tente novamente."
    fi
  done

  local username=""
  while [[ -z "$username" ]]; do
    read -r -p "Username: " username
    username="$(trim "$username")"
    if [[ -z "$username" ]]; then
      echo "Username nao pode estar vazio."
    fi
  done

  local password="" password2=""
  while true; do
    read -r -s -p "Password: " password
    echo
    read -r -s -p "Confirmar password: " password2
    echo
    if [[ -z "$password" ]]; then
      echo "Password nao pode estar vazia."
      continue
    fi
    if [[ "$password" != "$password2" ]]; then
      echo "Passwords nao coincidem. Tente novamente."
      continue
    fi
    break
  done

  local first_name="" last_name=""
  while [[ -z "$first_name" ]]; do
    read -r -p "Nome (first name): " first_name
    first_name="$(trim "$first_name")"
    if [[ -z "$first_name" ]]; then
      echo "Nome nao pode estar vazio."
    fi
  done
  while [[ -z "$last_name" ]]; do
    read -r -p "Apelido (last name): " last_name
    last_name="$(trim "$last_name")"
    if [[ -z "$last_name" ]]; then
      echo "Apelido nao pode estar vazio."
    fi
  done

  local nome
  nome="$(trim "$(printf "%s %s" "$first_name" "$last_name")")"
  if [[ -z "$nome" ]]; then
    nome="$username"
  fi

  echo
  echo "Resumo:"
  echo "  Grupo: $group_key - $group_label"
  echo "  Username: $username"
  echo "  Nome: $nome"
  echo

  # Default: ensure user is aligned to one RBAC group and has the provided password.
  # Email defaults to <username>@local at the management command level.
  run_manage criar_usuario_rbac \
    --username "$username" \
    --password "$password" \
    --nome "$nome" \
    --first-name "$first_name" \
    --last-name "$last_name" \
    --group "$group_key" \
    --exclusive \
    --reset-password
}

# Default passthrough args to management command.
ARGS=()
WIZARD="0"

# Simple arg parsing (no getopts to support long args cleanly).
while [[ $# -gt 0 ]]; do
  case "$1" in
    --list-groups)
      ARGS+=("--list-groups")
      shift
      ;;
    --wizard)
      WIZARD="1"
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

if [[ "$WIZARD" == "1" || ${#ARGS[@]} -eq 0 ]]; then
  wizard_create_user
  exit 0
fi

run_manage criar_usuario_rbac "${ARGS[@]}"
