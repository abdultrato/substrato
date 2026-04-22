#!/bin/sh
# ============================================================================
# ENTRYPOINT.SH - Script de inicialização do Django
# ============================================================================

set -eu

log() {
  echo "[substrato] $1"
}

echo "=================================================="
log "🚀 Iniciando Substrato..."
echo "=================================================="

STARTUP_TIMEOUT=${STARTUP_TIMEOUT:-30}
MAIN_CMD="${1:-}"

is_celery_like=0
if [ "$MAIN_CMD" = "celery" ]; then
  is_celery_like=1
fi

# ============================================================================
# Aguardar PostgreSQL
# ============================================================================

log "⏳ Aguardando banco de dados..."

python <<'PY'
import psycopg
import time
import os
import sys

max_retries = int(os.getenv("STARTUP_TIMEOUT", "30"))
retries = 0

db_host = os.getenv("DB_HOST", "localhost")
db_port = int(os.getenv("DB_PORT", "5432"))
db_name = os.getenv("DB_NAME", "substrato_db")
db_user = os.getenv("DB_USER", "substrato_user")
db_password = os.getenv("DB_PASSWORD", "dev_password")

while retries < max_retries:
    try:
        conn = psycopg.connect(
            host=db_host,
            port=db_port,
            dbname=db_name,
            user=db_user,
            password=db_password,
            connect_timeout=5
        )
        conn.close()
        print("✅ Banco de dados disponível!")
        sys.exit(0)
    except Exception:
        retries += 1
        print(f"⏳ Aguardando BD... ({retries}/{max_retries})")
        time.sleep(0.5)

print("❌ Banco de dados não está disponível!")
sys.exit(1)
PY


# ============================================================================
# Aguardar Redis
# ============================================================================

log "⏳ Aguardando Redis..."

python <<'PY'
import redis
import time
import os
import sys

max_retries = int(os.getenv("STARTUP_TIMEOUT", "30"))
retries = 0

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

while retries < max_retries:
    try:
        r = redis.from_url(redis_url)
        r.ping()
        print("✅ Redis disponível!")
        sys.exit(0)
    except Exception:
        retries += 1
        print(f"⏳ Aguardando Redis... ({retries}/{max_retries})")
        time.sleep(0.5)

print("❌ Redis não está disponível!")
sys.exit(1)
PY


# ============================================================================
# Django bootstrap (apenas 1 container)
# ============================================================================

if [ "$is_celery_like" -eq 1 ]; then
  log "⏭️  Celery detectado; pulando migrations/bootstrap."
else
  log "🔄 Executando migrations..."
  python manage.py migrate --noinput


  # ============================================================================
  # Superuser automático (apenas dev)
  # ============================================================================

  if [ "${DJANGO_DEBUG:-False}" = "True" ]; then

  log "👤 Verificando superuser..."

  python <<'PY'
import django
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant

User = get_user_model()

try:
    tenant, _ = Tenant.objects.get_or_create(
        identifier="default",
        defaults={"name": "Tenant Default"},
    )
    if not User.objects.filter(username="admin").exists():
        User.objects.create_superuser(
            "admin",
            "admin@exemplo.com",
            "admin123",
            tenant=tenant,
        )
        print("✅ Superuser 'admin' criado")
    else:
        user = User.objects.get(username="admin")
        # Se o usuário já existia (ex.: por resets anteriores) e agora está na allowlist,
        # garantimos que volta a ser superuser em DEV.
        try:
            from django.conf import settings

            allowlist = set(getattr(settings, "SUPERUSER_ALLOWLIST", []) or [])
        except Exception:
            allowlist = set()

        if ("admin" in allowlist) and (not getattr(user, "is_superuser", False)):
            user.is_superuser = True
            user.is_staff = True
            user.save(update_fields=["is_superuser", "is_staff"])
            print("ℹ️  Superuser 'admin' restaurado (allowlist)")

        if not getattr(user, "tenant_id", None):
            user.tenant = tenant
            user.save(update_fields=["tenant"])
            print("ℹ️  Superuser existente associado ao tenant padrão")
        else:
            print("ℹ️  Superuser já existe")
except Exception as exc:
    print(f"⚠️  Superuser automático ignorado: {exc}")
PY

  fi


  # ============================================================================
  # Sincronizar acesso admin (RBAC)
  # ============================================================================

  log "🔐 Sincronizando acesso admin (grupo Administrador -> staff/superuser)..."
  python manage.py sync_admin_access || echo "[substrato] ⚠️  sync_admin_access falhou, prosseguindo."


  # ============================================================================
  # Static files
  # ============================================================================

  log "📦 Coletando arquivos estáticos..."
  if python - <<'PY'
import os
from pathlib import Path
root = Path(os.getenv("STATIC_ROOT", "/app/staticfiles"))
root.mkdir(parents=True, exist_ok=True)
can_write = os.access(root, os.W_OK)
print(f"STATIC_ROOT={root} | write={can_write}")
if not can_write:
    raise SystemExit(1)
PY
  then
    python manage.py collectstatic --noinput --clear || echo "[substrato] ⚠️  collectstatic falhou, prosseguindo (ambiente dev)."
  else
    echo "[substrato] ⚠️  STATIC_ROOT sem permissão de escrita, pulando collectstatic."
  fi


  # ============================================================================
  # Limpeza de cache
  # ============================================================================

  log "🧹 Limpando cache..."

  python <<'PY'
import django
django.setup()

from django.core.cache import cache

cache.clear()
print("✅ Cache limpo!")
PY
fi


echo "=================================================="
log "✅ Inicialização concluída!"
echo "=================================================="

exec "$@"
