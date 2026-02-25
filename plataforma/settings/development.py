from .base import *

# =========================================================
# DEBUG & HOSTS
# =========================================================

DEBUG = True

ALLOWED_HOSTS = ["*"]


# =========================================================
# DEVELOPMENT APPS
# =========================================================

INSTALLED_APPS += [
    "django_extensions",  # ferramentas úteis
]


# =========================================================
# CORS (permite frontend local)
# =========================================================

CORS_ALLOW_ALL_ORIGINS = True


# =========================================================
# EMAIL (não envia emails reais)
# =========================================================

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


# =========================================================
# SECURITY (desativado para dev)
# =========================================================

SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False


# =========================================================
# CACHE (opcional: usar memória em dev)
# =========================================================

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}
