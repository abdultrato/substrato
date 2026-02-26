import os
from pathlib import Path
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

from .constants import *
from .security import *

BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env")


def get_env(name, default=None, required=False):
    value = os.getenv(name, default)
    if required and not value:
        raise ImproperlyConfigured(f"Environment variable '{name}' is required")
    return value


# =========================================================
# CORE
# =========================================================

SECRET_KEY = get_env("DJANGO_SECRET_KEY", required=True)
DEBUG = get_env("DJANGO_DEBUG", "False") == "True"

ALLOWED_HOSTS = get_env("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")


# =========================================================
# APPLICATIONS
# =========================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "django_filters",
    "corsheaders",
    # Apps internas
    "aplicativos.identidade",
    "aplicativos.clinico",
    "aplicativos.faturamento",
    "aplicativos.pagamentos",
    "aplicativos.notificacoes",
    "aplicativos.inquilinos",
]


# =========================================================
# MIDDLEWARE
# =========================================================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Multi-tenant
    "infrastrutura.middleware.inquilino.InquilinoMiddleware",
]


# =========================================================
# DATABASE
# =========================================================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": get_env("DB_NAME", required=True),
        "USER": get_env("DB_USER", required=True),
        "PASSWORD": get_env("DB_PASSWORD", required=True),
        "HOST": get_env("DB_HOST", "localhost"),
        "PORT": get_env("DB_PORT", "5432"),
    }
}


# =========================================================
# AUTH
# =========================================================

AUTH_USER_MODEL = "identidade.Usuario"


# =========================================================
# TEMPLATES
# =========================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# =========================================================
# STATIC
# =========================================================

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# =========================================================
# REST FRAMEWORK
# =========================================================

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
}


# =========================================================
# JWT
# =========================================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
}

REST_FRAMEWORK = {
    ...
    "DEFAULT_THROTTLE_CLASSES": [
        "seguranca.throttling.BurstRateThrottle",
        "seguranca.throttling.SustainedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "burst": "30/min",
        "sustained": "1000/day",
        "anon_burst": "10/min",
    },
}

"DEFAULT_THROTTLE_RATES": {
    "burst": "30/min",
    "sustained": "1000/day",
    "anon_burst": "10/min",
    "login": "5/min",
}
