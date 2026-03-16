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


CORS_ALLOW_ALL_ORIGINS = True

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
]


CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}


SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False


LOGGING["root"]["level"] = "DEBUG"
