#!/bin/bash
# ============================================================================
# ENTRYPOINT.SH - Script de inicialização do Django
# ============================================================================

set -e

echo "=================================================="
echo "🚀 Iniciando Substrato..."
echo "=================================================="

# Aguardar banco de dados ficar pronto
echo "⏳ Aguardando banco de dados..."
python << END
import psycopg
import time
import os

max_retries = 30
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
        break
    except (psycopg.OperationalError, psycopg.Error) as e:
        retries += 1
        if retries < max_retries:
            print(f"⏳ Aguardando BD... ({retries}/{max_retries})")
            time.sleep(1)
        else:
            print("❌ Banco de dados não está disponível!")
            exit(1)
END

# Aguardar Redis
echo "⏳ Aguardando Redis..."
python << END
import redis
import time
import os

max_retries = 30
retries = 0

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

while retries < max_retries:
    try:
        r = redis.from_url(redis_url)
        r.ping()
        print("✅ Redis disponível!")
        break
    except Exception as e:
        retries += 1
        if retries < max_retries:
            print(f"⏳ Aguardando Redis... ({retries}/{max_retries})")
            time.sleep(1)
        else:
            print("❌ Redis não está disponível!")
            exit(1)
END

# Executar migrations
echo "🔄 Executando migrations..."
python manage.py migrate --noinput

# Criar superuser se não existir (desenvolvimento apenas)
if [ "$DJANGO_DEBUG" = "True" ]; then
    echo "👤 Criando superuser de desenvolvimento..."
    python << END
from django.contrib.auth import get_user_model
from django.db import connection
from django.conf import settings

User = get_user_model()

if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@exemplo.com', 'admin123')
    print("✅ Superuser 'admin' criado com senha 'admin123'")
else:
    print("ℹ️  Superuser 'admin' já existe")
END
fi

# Coletar arquivos estáticos
echo "📦 Coletando arquivos estáticos..."
python manage.py collectstatic --noinput --clear

# Limpar cache
echo "🧹 Limpando cache..."
python << END
from django.core.cache import cache
cache.clear()
print("✅ Cache limpo!")
END

echo "=================================================="
echo "✅ Inicialização concluída!"
echo "=================================================="

# Executar comando passado
exec "$@"
