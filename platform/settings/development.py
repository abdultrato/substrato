# ruff: noqa: F403, F405

import os

from .base import *
from .logging import LOGGING

DEBUG = True

def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _csv_values(raw: str) -> list[str]:
    return [item.strip() for item in raw.split(",") if item.strip()]


def _csv_env(name: str, default: str, *, include_default: bool = False) -> list[str]:
    default_values = _csv_values(default)
    raw = os.getenv(name)
    if raw is None:
        return default_values
    env_values = _csv_values(raw)
    if not include_default:
        return env_values

    merged: list[str] = []
    for item in [*default_values, *env_values]:
        if item not in merged:
            merged.append(item)
    return merged


ALLOWED_HOSTS = _csv_env(
    "DJANGO_ALLOWED_HOSTS",
    ",".join(
        [
            "localhost",
            "127.0.0.1",
            "0.0.0.0",
            "::1",
            "[::1]",
            "testserver",
            ".local",
            "100.93.161.102",
            ".replit.dev",
            ".repl.co",
            ".replit.app",
        ]
    ),
    include_default=True,
)


# Em dev, permitir configurar SMTP via variáveis (ex.: docker/.env). Se não
# estiver definido, cai para console backend.
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)


# Para cookies HttpOnly funcionarem no frontend, precisamos permitir
# credenciais e declarar origens explicitamente. Nao usar wildcard por
# defeito: com credenciais isso transforma qualquer origin em origin confiavel.
CORS_ALLOW_ALL_ORIGINS = _env_bool("CORS_ALLOW_ALL_ORIGINS", False)
CORS_ALLOWED_ORIGINS = _csv_env(
    "CORS_ALLOWED_ORIGINS",
    ",".join(
        [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://0.0.0.0:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://0.0.0.0:3001",
            "http://localhost:5000",
            "http://127.0.0.1:5000",
            "http://0.0.0.0:5000",
            "http://100.93.161.102:3000",
            "http://100.93.161.102:3001",
            "http://100.93.161.102:5000",
            # Access via docker bridge (frontend container hitting backend container).
            "http://172.18.0.1:3000",
            "http://172.18.0.1:3001",
            "http://172.18.0.1:5000",
        ]
    ),
    include_default=True,
)
CORS_ALLOW_CREDENTIALS = True

# Quando o Django Admin e endpoints HTML são acessados via proxy do Next.js
# (ex.: http://localhost:3000/admin/), o header Origin vem com porta diferente
# do backend (8000). Django considera isso cross-origin e exige CSRF_TRUSTED_ORIGINS.
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://0.0.0.0:5000",
    # Next dev pode subir em 3001 quando 3000 estiver ocupado (docker, etc).
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://0.0.0.0:3001",
    "http://100.93.161.102:3000",
    "http://100.93.161.102:3001",
    # Replit dev domains (preview proxy + direct port)
    "https://*.replit.dev",
    "https://*.repl.co",
    "https://*.replit.app",
]

# Replit dev/produção é servido atrás de proxy HTTPS; o cabeçalho informa
# o esquema original ao Django para que CSRF/cookies seguros funcionem.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = _env_bool("USE_X_FORWARDED_HOST", False)


# Em desenvolvimento, só usa Redis quando USE_REDIS=true.
# Isso evita latência alta quando REDIS_URL está definido mas o serviço não está ativo.
REDIS_URL = os.getenv("REDIS_URL", "").strip()
if USE_REDIS and REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "IGNORE_EXCEPTIONS": True,
                # Timeouts curtos para não travar requests em ambiente local.
                "SOCKET_CONNECT_TIMEOUT": float(os.getenv("REDIS_SOCKET_CONNECT_TIMEOUT", "0.2")),
                "SOCKET_TIMEOUT": float(os.getenv("REDIS_SOCKET_TIMEOUT", "0.2")),
                "RETRY_ON_TIMEOUT": False,
            },
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }


SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Em desenvolvimento, reduzir overhead de request para navegação mais instantânea.
# Mantemos apenas middlewares essenciais ao fluxo funcional local.
_DEV_DISABLED_MIDDLEWARE = {
    "infrastructure.middleware.limits.TenantLimitMiddleware",
    "infrastructure.middleware.audit.TenantAuditMiddleware",
    "infrastructure.middleware.user_activity.UserActivityMiddleware",
    "infrastructure.middleware.performance.APILoggingMiddleware",
}
MIDDLEWARE = [mw for mw in MIDDLEWARE if mw not in _DEV_DISABLED_MIDDLEWARE]

# Reduz ruído de logs frequentes (ex.: rbac_denied) que pode degradar I/O em dev.
_dev_loggers = LOGGING.setdefault("loggers", {})
_dev_loggers.setdefault("security.permissions.rbac", {"handlers": ["console"], "propagate": False})
_dev_loggers["security.permissions.rbac"]["level"] = os.getenv("DEV_RBAC_LOG_LEVEL", "WARNING").upper()
_dev_loggers.setdefault("metrics", {"handlers": ["console"], "propagate": False})
_dev_loggers["metrics"]["level"] = os.getenv("DEV_METRICS_LOG_LEVEL", "WARNING").upper()


LOGGING["root"]["level"] = os.getenv("DEV_ROOT_LOG_LEVEL", "INFO").upper()
"""Ajustes adicionais de desenvolvimento (debug, ferramentas locais)."""
