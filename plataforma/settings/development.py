from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Email não envia de verdade
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# CORS liberado em dev
CORS_ALLOW_ALL_ORIGINS = True

# Cache em memória para desenvolvimento
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# Segurança relaxada
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
