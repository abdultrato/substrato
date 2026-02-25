import os

from .base import *
from .logging import LOGGING

# =========================================================
# CORE
# =========================================================

DEBUG = False

ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",")

if not ALLOWED_HOSTS or ALLOWED_HOSTS == [""]:
    raise RuntimeError("DJANGO_ALLOWED_HOSTS must be set in production")


# =========================================================
# SECURITY — HTTPS & HEADERS
# =========================================================

SECURE_SSL_REDIRECT = True

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True


# =========================================================
# CSRF TRUSTED ORIGINS
# =========================================================

origins = os.getenv("CSRF_TRUSTED_ORIGINS", "")
CSRF_TRUSTED_ORIGINS = [
    origin.strip() for origin in origins.split(",") if origin.strip()
]


# =========================================================
# CORS (configure corretamente)
# =========================================================

CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]


# =========================================================
# STATIC FILES (produção)
# =========================================================

STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"


# =========================================================
# DATABASE PERFORMANCE
# =========================================================

DATABASES["default"]["CONN_MAX_AGE"] = 600
DATABASES["default"]["OPTIONS"]["connect_timeout"] = 10


# =========================================================
# REDIS CACHE HARDENING
# =========================================================

CACHES["default"]["TIMEOUT"] = 600


# =========================================================
# EMAIL (SMTP real)
# =========================================================

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER


# =========================================================
# LOGGING — PRODUÇÃO
# =========================================================
# Mantém estrutura definida em settings/logging.py
# Apenas endurece níveis para produção

LOGGING["root"]["level"] = "WARNING"
LOGGING["loggers"]["django"]["level"] = "WARNING"
LOGGING["loggers"]["django.request"]["level"] = "ERROR"

# garante que logs críticos vão para arquivo
if "file" in LOGGING["handlers"]:
    LOGGING["handlers"]["file"]["level"] = "WARNING"
