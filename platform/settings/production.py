# ruff: noqa: F403,F405

import os

from .base import *
from .logging import LOGGING

# =========================================================
# CORE
# =========================================================

DEBUG = True

ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",") if host.strip()]

if not ALLOWED_HOSTS:
    raise RuntimeError("DJANGO_ALLOWED_HOSTS must be set in production")


# =========================================================
# HTTPS & SECURITY
# =========================================================

SECURE_SSL_REDIRECT = True

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Proteção contra downgrade de HTTPS
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")


# =========================================================
# CORS (produção)
# =========================================================

CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if origin.strip()]


# =========================================================
# DATABASE PERFORMANCE
# =========================================================

DATABASES["default"]["CONN_MAX_AGE"] = 600

DATABASES["default"]["OPTIONS"].update(
    {
        "connect_timeout": 10,
    }
)


# =========================================================
# STATIC FILES
# =========================================================

STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"


# =========================================================
# CACHE HARDENING
# =========================================================

CACHES["default"]["OPTIONS"]["IGNORE_EXCEPTIONS"] = False


# =========================================================
# DJANGO ADMIN SECURITY
# =========================================================

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True


# =========================================================
# DRF (produção)
# =========================================================

REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [
    "rest_framework.renderers.JSONRenderer",
]


# =========================================================
# LOGGING
# =========================================================

LOGGING = LOGGING
