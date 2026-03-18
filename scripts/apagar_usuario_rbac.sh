#!/usr/bin/env bash
set -euo pipefail

# Apaga (hard delete) ou desativa (recomendado) um usuário no Substrato.
#
# Uso:
#   ./scripts/apagar_usuario_rbac.sh               # modo interativo
#   ./scripts/apagar_usuario_rbac.sh -u joao       # desativar (com confirmação)
#   ./scripts/apagar_usuario_rbac.sh -u joao --hard --yes

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

docker_usable() {
  # Verifica se o daemon está acessível (evita falhar quando não há permissão).
  docker info >/dev/null 2>&1
}

detect_runner() {
  if [[ -n "${SUBSTRATO_RUNNER:-}" ]]; then
    echo "${SUBSTRATO_RUNNER}"
    return
  fi

  if command -v docker >/dev/null 2>&1 && docker_usable; then
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
  scripts/apagar_usuario_rbac.sh                       (modo interativo)
  scripts/apagar_usuario_rbac.sh -u USERNAME [opções]
  scripts/apagar_usuario_rbac.sh --email EMAIL [opções]

Obrigatório (não interativo):
  -u, --username        Username do usuário (ou --email)

Opções:
      --email           E-mail (alternativa ao username)
      --hard            Apaga permanentemente do banco (hard delete)
      --yes             Não pede confirmação
  -h, --help            Ajuda

Exemplos:
  scripts/apagar_usuario_rbac.sh
  scripts/apagar_usuario_rbac.sh -u recep1
  scripts/apagar_usuario_rbac.sh -u recep1 --hard --yes
EOF
}

trim() {
  local s="${1:-}"
  # shellcheck disable=SC2001
  echo "$(echo "$s" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
}

RUNNER="$(detect_runner)"

run_manage() {
  case "$RUNNER" in
    docker)
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

list_users() {
  run_manage shell -c "
from django.contrib.auth import get_user_model
qs = get_user_model().objects.order_by('username')
for u in qs:
    groups = ','.join(u.groups.values_list('name', flat=True))
    print(f\"{u.username}\\t{u.email or ''}\\t{groups}\")
"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

ARGS=()
USERNAME=""
EMAIL=""
HARD="0"
YES="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -u|--username)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "Erro: -u/--username requer um valor." >&2
        exit 2
      fi
      USERNAME="$2"
      ARGS+=("--username" "$2")
      shift 2
      ;;
    --email)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "Erro: --email requer um valor." >&2
        exit 2
      fi
      EMAIL="$2"
      ARGS+=("--email" "$2")
      shift 2
      ;;
    --hard)
      HARD="1"
      ARGS+=("--hard")
      shift
      ;;
    --yes)
      YES="1"
      ARGS+=("--yes")
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

if [[ ${#ARGS[@]} -eq 0 ]]; then
  echo
  echo "Apagar utilizador (RBAC) - modo interativo"
  echo "Runner: $RUNNER"
  echo

  echo "Utilizadores disponíveis:"
  mapfile -t USERS < <(list_users)
  if [[ ${#USERS[@]} -eq 0 ]]; then
    echo "Nenhum usuário encontrado."
    exit 0
  fi

  for i in "${!USERS[@]}"; do
    IFS=$'\t' read -r uname uemail ugroups <<<"${USERS[$i]}"
    idx=$((i + 1))
    echo "  ${idx}. ${uname} (${uemail:-sem email}) [${ugroups:-sem grupo}]"
  done

  choice=""
  username=""
  while [[ -z "${username:-}" ]]; do
    read -r -p "Selecione o número do usuário: " choice
    choice="$(trim "$choice")"
    if [[ "$choice" =~ ^[0-9]+$ ]]; then
      idx=$((choice - 1))
      if (( idx >= 0 && idx < ${#USERS[@]} )); then
        IFS=$'\t' read -r username _ _ <<<"${USERS[$idx]}"
      fi
    fi
    if [[ -z "$username" ]]; then
      echo "Opção inválida. Tente novamente."
    fi
  done

  hard="n"
  read -r -p "Apagar permanentemente do banco? (s/N): " hard
  hard="$(trim "$hard")"
  hard="${hard,,}"

  if [[ "$hard" == "s" || "$hard" == "sim" || "$hard" == "y" || "$hard" == "yes" ]]; then
    echo
    echo "ATENCAO: isto vai apagar permanentemente o usuario '$username'."
    read -r -p "Digite APAGAR para confirmar: " confirm
    confirm="$(trim "$confirm")"
    if [[ "$confirm" != "APAGAR" ]]; then
      echo "Cancelado."
      exit 0
    fi
    run_manage apagar_usuario_rbac --username "$username" --hard --yes
  else
    echo
    echo "Vai desativar o usuario '$username' (mantem historico/auditoria)."
    read -r -p "Digite DESATIVAR para confirmar: " confirm
    confirm="$(trim "$confirm")"
    if [[ "$confirm" != "DESATIVAR" ]]; then
      echo "Cancelado."
      exit 0
    fi
    run_manage apagar_usuario_rbac --username "$username" --yes
  fi

  exit 0
fi

# Não-interativo: confirma em bash (evita prompt dentro do container) a menos que --yes seja usado.
if [[ -z "${USERNAME:-}" && -z "${EMAIL:-}" ]]; then
  echo "Erro: informe --username ou --email." >&2
  echo >&2
  usage >&2
  exit 2
fi

if [[ "$YES" != "1" ]]; then
  target="${USERNAME:-$EMAIL}"
  if [[ "$HARD" == "1" ]]; then
    echo "ATENCAO: isto vai apagar permanentemente o usuario '${target}'."
    if ! read -r -p "Digite APAGAR para confirmar: " confirm; then
      echo "Erro: stdin fechado. Use --yes para modo nao-interativo." >&2
      exit 2
    fi
    confirm="$(trim "$confirm")"
    if [[ "$confirm" != "APAGAR" ]]; then
      echo "Cancelado."
      exit 0
    fi
  else
    echo "Vai desativar o usuario '${target}' (mantem historico/auditoria)."
    if ! read -r -p "Digite DESATIVAR para confirmar: " confirm; then
      echo "Erro: stdin fechado. Use --yes para modo nao-interativo." >&2
      exit 2
    fi
    confirm="$(trim "$confirm")"
    if [[ "$confirm" != "DESATIVAR" ]]; then
      echo "Cancelado."
      exit 0
    fi
  fi
  ARGS+=("--yes")
fi

run_manage apagar_usuario_rbac "${ARGS[@]}"
