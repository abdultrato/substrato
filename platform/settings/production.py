# ruff: noqa: F403,F405

import os

from django.core.exceptions import ImproperlyConfigured

from .base import *
from .logging import LOGGING


def _env_bool(name, default):
    return os.getenv(name, str(default)).lower() in ("1", "true", "yes", "on")


def _required_csv(name):
    values = [value.strip() for value in os.getenv(name, "").split(",") if value.strip()]
    if not values:
        raise ImproperlyConfigured(f"{name} must be set in production")
    return values


def _validate_secret_key():
    weak_prefixes = ("django-insecure-", "change-me", "changeme")
    normalized = (SECRET_KEY or "").strip().lower()
    if len(SECRET_KEY or "") < 50 or any(normalized.startswith(prefix) for prefix in weak_prefixes):
        raise ImproperlyConfigured("DJANGO_SECRET_KEY is weak for production")


# =========================================================
# CORE
# =========================================================

DEBUG = _env_bool("DJANGO_DEBUG", False)
if DEBUG:
    raise ImproperlyConfigured("DJANGO_DEBUG must be False in production")

_validate_secret_key()

ALLOWED_HOSTS = _required_csv("DJANGO_ALLOWED_HOSTS")


# =========================================================
# HTTPS & SECURITY
# =========================================================

SECURE_SSL_REDIRECT = _env_bool("SECURE_SSL_REDIRECT", True)

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_RESOURCE_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = _env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", True)
SECURE_HSTS_PRELOAD = _env_bool("SECURE_HSTS_PRELOAD", True)

# Proteção contra downgrade de HTTPS
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True


# =========================================================
# CORS / CSRF (produção)
# =========================================================

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = _required_csv("CORS_ALLOWED_ORIGINS")
CSRF_TRUSTED_ORIGINS = _required_csv("CSRF_TRUSTED_ORIGINS")


# =========================================================
# DATABASE PERFORMANCE
# =========================================================

if DATABASES["default"]["ENGINE"].endswith("sqlite3"):
    raise ImproperlyConfigured("Production must not use sqlite3. Configure PostgreSQL.")

DATABASES["default"]["CONN_MAX_AGE"] = int(os.getenv("DB_CONN_MAX_AGE", "600"))
db_options = DATABASES["default"].setdefault("OPTIONS", {})
db_options["connect_timeout"] = int(os.getenv("DB_CONNECT_TIMEOUT_SECONDS", "10"))


# =========================================================
# STATIC FILES
# =========================================================

STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"


# =========================================================
# CACHE HARDENING
# =========================================================

if not USE_REDIS:
    raise ImproperlyConfigured("USE_REDIS must be true in production for scalable cache.")

cache_options = CACHES["default"].setdefault("OPTIONS", {})
cache_options["IGNORE_EXCEPTIONS"] = False


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
"""Configurações específicas de produção (security, cache, DB)."""
