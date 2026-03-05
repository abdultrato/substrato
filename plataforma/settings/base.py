import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# =========================================================
# PATH & ENV
# =========================================================

BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env.staging")

ROOT_URLCONF = "plataforma.urls"
WSGI_APPLICATION = "plataforma.wsgi.application"


def get_env(name, default = None, required = False) :
	value = os.getenv(name, default)
	
	if required and not value :
		raise ImproperlyConfigured(f"{name} is required")
	
	return value


# =========================================================
# CORE
# =========================================================

SECRET_KEY = get_env("DJANGO_SECRET_KEY", required = True)

DEBUG = get_env("DJANGO_DEBUG", "False").lower() == "true"

ALLOWED_HOSTS = [host.strip() for host in get_env("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",") if host.strip()]

# =========================================================
# REDIS
# =========================================================

REDIS_URL = get_env("REDIS_URL", "redis://127.0.0.1:6379/1")

# =========================================================
# APPLICATIONS
# =========================================================

INSTALLED_APPS = [
	
	# Django
	"django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions", "django.contrib.messages", "django.contrib.staticfiles",
	
	# Third-party
	"rest_framework", "rest_framework_simplejwt", "django_filters", "corsheaders",
	
	# Internas
	"aplicativos.identidade", "aplicativos.seguradora.apps.SeguradoraConfig", "aplicativos.clinico", "aplicativos.faturamento", "aplicativos.pagamentos", "aplicativos.notificacoes", "aplicativos.inquilinos", "aplicativos.farmacia", "aplicativos.contabilidade", ]

# =========================================================
# MIDDLEWARE
# =========================================================

MIDDLEWARE = [
	
	"django.middleware.security.SecurityMiddleware", "corsheaders.middleware.CorsMiddleware",
	
	"django.contrib.sessions.middleware.SessionMiddleware", "django.middleware.common.CommonMiddleware", "django.middleware.csrf.CsrfViewMiddleware",
	
	# multi-tenant
	"infrastrutura.middleware.inquilino.InquilinoMiddleware",
	
	"django.contrib.auth.middleware.AuthenticationMiddleware", "django.contrib.messages.middleware.MessageMiddleware", "django.middleware.clickjacking.XFrameOptionsMiddleware",
	
	# request context
	"infrastrutura.middleware.request_user.RequestUserMiddleware",
	
	# limites por tenant
	"infrastrutura.middleware.limits.TenantLimitMiddleware",
	
	# auditoria
	"infrastrutura.middleware.audit.TenantAuditMiddleware",
	
	# logging
	"infrastrutura.middleware.performance.APILoggingMiddleware", ]

# =========================================================
# DATABASE
# =========================================================

DB_ENGINE = get_env("DB_ENGINE", "postgres")

if DB_ENGINE == "sqlite" :
	DATABASES = {"default" : {"ENGINE" : "django.db.backends.sqlite3", "NAME" : BASE_DIR / "test_db.sqlite3", }}
	
	PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher", ]

else :
	DATABASES = {"default" : {"ENGINE" : "django.db.backends.postgresql", "NAME" : get_env("DB_NAME", required = True), "USER" : get_env("DB_USER", required = True), "PASSWORD" : get_env("DB_PASSWORD", required = True), "HOST" : get_env("DB_HOST", "localhost"), "PORT" : get_env("DB_PORT", "5432"), "CONN_MAX_AGE" : 300, "OPTIONS" : {"connect_timeout" : 10, }, }}

DATABASE_ROUTERS = ["infrastrutura.banco_dados.TenantDatabaseRouter"]

# =========================================================
# CACHE (Redis)
# =========================================================

CACHES = {"default" : {"BACKEND" : "django_redis.cache.RedisCache", "LOCATION" : REDIS_URL, "OPTIONS" : {"CLIENT_CLASS" : "django_redis.client.DefaultClient", "IGNORE_EXCEPTIONS" : True, }, "TIMEOUT" : 300, }}

# =========================================================
# AUTH
# =========================================================

AUTH_USER_MODEL = "identidade.Usuario"

# =========================================================
# TEMPLATES
# =========================================================

TEMPLATES = [{"BACKEND" : "django.template.backends.django.DjangoTemplates", "DIRS" : [BASE_DIR / "templates"], "APP_DIRS" : True, "OPTIONS" : {"context_processors" : ["django.template.context_processors.request", "django.contrib.auth.context_processors.auth", "django.contrib.messages.context_processors.messages", ], }, }]

# =========================================================
# STATIC / MEDIA
# =========================================================

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# =========================================================
# INTERNATIONALIZATION
# =========================================================

LANGUAGE_CODE = "pt-br"

TIME_ZONE = get_env("DJANGO_TIME_ZONE", "Africa/Maputo")

USE_I18N = True
USE_TZ = True
USE_L10N = True

# =========================================================
# REST FRAMEWORK
# =========================================================

REST_FRAMEWORK = {
	
	"DEFAULT_PERMISSION_CLASSES"     : ["rest_framework.permissions.IsAuthenticated", ],
	
	"DEFAULT_AUTHENTICATION_CLASSES" : ["rest_framework_simplejwt.authentication.JWTAuthentication", ],
	
	"DEFAULT_FILTER_BACKENDS"        : ["django_filters.rest_framework.DjangoFilterBackend", ],
	
	"DEFAULT_THROTTLE_CLASSES"       : ["seguranca.throttling.BurstRateThrottle", "seguranca.throttling.SustainedRateThrottle", "seguranca.throttling.AnonBurstRateThrottle", ],
	
	"DEFAULT_THROTTLE_RATES"         : {"burst" : "30/min", "sustained" : "1000/day", "anon_burst" : "10/min", "login" : "5/min", }, }

# =========================================================
# JWT
# =========================================================

SIMPLE_JWT = {
	
	"ACCESS_TOKEN_LIFETIME" : timedelta(hours = 8), "REFRESH_TOKEN_LIFETIME" : timedelta(days = 1),
	
	"AUTH_HEADER_TYPES"     : ("Bearer",), }

# =========================================================
# CORS
# =========================================================

CORS_ALLOW_ALL_ORIGINS = DEBUG

if not DEBUG :
	CORS_ALLOWED_ORIGINS = [origin.strip() for origin in get_env("CORS_ALLOWED_ORIGINS", "").split(",") if origin.strip()]

# =========================================================
# SECURITY
# =========================================================

SECURE_CONTENT_TYPE_NOSNIFF = True

X_FRAME_OPTIONS = "DENY"

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

SECURE_BROWSER_XSS_FILTER = True

# =========================================================
# CELERY
# =========================================================

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

CELERY_TIMEZONE = TIME_ZONE

# =========================================================
# DEFAULT PRIMARY KEY
# =========================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"