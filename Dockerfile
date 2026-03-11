# ============================================================================
# BACKEND - DJANGO DOCKERFILE
# Multi-stage build para reduzir tamanho final
# ============================================================================

# Stage 1: Builder
FROM python:3.13-slim as builder

WORKDIR /app

# Instalar dependências do sistema para compilação
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# ============================================================================
# Stage 2: Runtime
FROM python:3.13-slim

WORKDIR /app

# Instalar dependências mínimas de runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependências instaladas do builder
COPY --from=builder /usr/local /usr/local

# Copiar código da aplicação
COPY . .

# Configurar PATH para incluir o diretório de dependências
ENV PATH=/usr/local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_SETTINGS_MODULE=plataforma.settings.development

# Criar usuário não-root por segurança
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/staticfiles && \
    mkdir -p /app/media && \
    chown -R appuser:appuser /app

# Tornar script executável
RUN chmod +x /app/entrypoint.sh

# Mudar para usuário não-root
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health/live || exit 1

# Expor porta
EXPOSE 8000

# Executar o entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Comando padrão
CMD ["gunicorn", "plataforma.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--worker-class", "sync", "--timeout", "120"]
