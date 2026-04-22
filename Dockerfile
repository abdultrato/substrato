# ==========================================================
# STAGE 1 — BUILDER
# ==========================================================
FROM python:3.13-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

ENV PIP_DISABLE_PIP_VERSION_CHECK=1

COPY requirements.txt .

RUN pip install --root-user-action=ignore --upgrade pip setuptools wheel

RUN --mount=type=cache,target=/root/.cache/pip \
    pip wheel \
    --prefer-binary \
    --wheel-dir /wheels \
    -r requirements.txt


# ==========================================================
# STAGE 2 — RUNTIME
# ==========================================================
FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DJANGO_SETTINGS_MODULE=plataforma.settings.development

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    postgresql-client \
    curl \
    # Fontes para PDFs (Tinos/Liberation, livres)
    fontconfig \
    fonts-croscore \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /wheels /wheels

RUN pip install --root-user-action=ignore --no-cache-dir --no-index --find-links=/wheels /wheels/* \
    && rm -rf /wheels

# entrypoint fora de /app para não ser sobrescrito por bind-mount (Windows)
COPY entrypoint.sh /usr/local/bin/substrato-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/substrato-entrypoint.sh \
    && chmod +x /usr/local/bin/substrato-entrypoint.sh

# criar usuário antes de copiar arquivos
RUN useradd -m -u 1000 appuser

# copiar código já com owner correto
COPY --chown=appuser:appuser . .

RUN mkdir -p /app/staticfiles /app/media \
    && chown -R appuser:appuser /app/staticfiles /app/media

RUN chmod +x /app/entrypoint.sh || true

USER appuser

EXPOSE 8000

HEALTHCHECK CMD curl -f http://localhost:8000/health/live || exit 1

ENTRYPOINT ["/usr/local/bin/substrato-entrypoint.sh"]

CMD gunicorn plataforma.wsgi:application --bind 0.0.0.0:8000 --workers 3 --worker-class gthread --threads 4 --timeout 120 --access-logfile - --error-logfile -
