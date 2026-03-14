# entrypoint.ps1
# Script de inicialização do Django para Windows (PowerShell)

function Log($msg) {
    Write-Host "[substrato] $msg"
}

Write-Host "=================================================="
Log "🚀 Iniciando Substrato..."
Write-Host "=================================================="

$STARTUP_TIMEOUT = $env:STARTUP_TIMEOUT
if (-not $STARTUP_TIMEOUT) { $STARTUP_TIMEOUT = 30 }

# Aguardar banco de dados
Log "⏳ Aguardando banco de dados..."
python - <<PY
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

# Aguardar Redis
Log "⏳ Aguardando Redis..."
python - <<PY
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

# Django migrations
Log "🔄 Executando migrations..."
python manage.py migrate --noinput

# Superuser automático (apenas dev)
if ($env:DJANGO_DEBUG -eq "True") {
    Log "👤 Verificando superuser..."
    python - <<PY
import django
django.setup()
from django.contrib.auth import get_user_model
from aplicativos.inquilinos.modelos.inquilino import Inquilino
User = get_user_model()
tenant, _ = Inquilino.objects.get_or_create(
    identificador="default",
    defaults={"nome": "Tenant Default"},
)
if not User.objects.filter(username="admin").exists():
    User.objects.create_superuser(
        "admin",
        "admin@exemplo.com",
        "admin123",
        inquilino=tenant,
    )
    print("✅ Superuser 'admin' criado")
else:
    user = User.objects.get(username="admin")
    if not getattr(user, "inquilino_id", None):
        user.inquilino = tenant
        user.save(update_fields=["inquilino"])
        print("ℹ️  Superuser existente associado ao tenant padrão")
    else:
        print("ℹ️  Superuser já existe")
PY
}

# Static files
Log "📦 Coletando arquivos estáticos..."
$staticRootCheck = python - <<PY
import os
from pathlib import Path
root = Path(os.getenv("STATIC_ROOT", "/app/staticfiles"))
root.mkdir(parents=True, exist_ok=True)
can_write = os.access(root, os.W_OK)
print(f"STATIC_ROOT={root} | write={can_write}")
if not can_write:
    raise SystemExit(1)
PY
if ($LASTEXITCODE -eq 0) {
    try {
        python manage.py collectstatic --noinput --clear
    } catch {
        Log "⚠️  collectstatic falhou, prosseguindo (ambiente dev)."
    }
} else {
    Log "⚠️  STATIC_ROOT sem permissão de escrita, pulando collectstatic."
}

# Limpeza de cache
Log "🧹 Limpando cache..."
python - <<PY
import django
django.setup()
from django.core.cache import cache
cache.clear()
print("✅ Cache limpo!")
PY

Write-Host "=================================================="
Log "✅ Inicialização concluída!"
Write-Host "=================================================="

# Execução final (adaptado para Windows)
# Para rodar comandos adicionais, use Start-Process ou Invoke-Expression
# Exemplo: Invoke-Expression $args

