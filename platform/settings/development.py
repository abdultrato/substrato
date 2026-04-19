# ruff: noqa: F403

import os

from .base import *
from .logging import LOGGING

DEBUG = True

ALLOWED_HOSTS = ["*"]


# Em dev, permitir configurar SMTP via variáveis (ex.: docker/.env). Se não
# estiver definido, cai para console backend.
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)


# Para cookies HttpOnly funcionarem no frontend (localhost:3000),
# precisamos permitir credenciais e declarar origens explicitamente.
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://0.0.0.0:3001",
    "http://100.93.161.102:3000",
    "http://100.93.161.102:3001",
    # Access via docker bridge (frontend container hitting backend container).
    "http://172.18.0.1:3000",
    "http://172.18.0.1:3001",
]
CORS_ALLOW_CREDENTIALS = True

# Quando o Django Admin e endpoints HTML são acessados via proxy do Next.js
# (ex.: http://localhost:3000/admin/), o header Origin vem com porta diferente
# do backend (8000). Django considera isso cross-origin e exige CSRF_TRUSTED_ORIGINS.
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
    # Next dev pode subir em 3001 quando 3000 estiver ocupado (docker, etc).
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://0.0.0.0:3001",
    "http://100.93.161.102:3000",
    "http://100.93.161.102:3001",
]


REDIS_URL = os.getenv("REDIS_URL")
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "IGNORE_EXCEPTIONS": True,
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


LOGGING["root"]["level"] = "DEBUG"
"""Ajustes adicionais de desenvolvimento (debug, ferramentas locais)."""
