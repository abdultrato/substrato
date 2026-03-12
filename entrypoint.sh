#!/usr/bin/env bash
# ============================================================================
# ENTRYPOINT.SH - Script de inicialização do Django
# ============================================================================

set -euo pipefail

log() {
  echo "[substrato] $1"
}

echo "=================================================="
log "🚀 Iniciando Substrato..."
echo "=================================================="

STARTUP_TIMEOUT=${STARTUP_TIMEOUT:-30}

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
# Django migrations
# ============================================================================

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

User = get_user_model()

if not User.objects.filter(username="admin").exists():
    User.objects.create_superuser(
        "admin",
        "admin@exemplo.com",
        "admin123"
    )
    print("✅ Superuser 'admin' criado")
else:
    print("ℹ️  Superuser já existe")
PY

fi


# ============================================================================
# Static files
# ============================================================================

log "📦 Coletando arquivos estáticos..."
python manage.py collectstatic --noinput --clear


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


echo "=================================================="
log "✅ Inicialização concluída!"
echo "=================================================="

exec "$@"
