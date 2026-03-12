import os

from .base import *
from .logging import LOGGING


DEBUG = True

ALLOWED_HOSTS = ["*"]


EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


CORS_ALLOW_ALL_ORIGINS = True


CACHES = {
		"default": {
				"BACKEND": "django.core.cache.backends.locmem.LocMemCache",
				}
		}


SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False


LOGGING["root"]["level"] = "DEBUG"
