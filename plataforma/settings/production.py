import os
from .base import *
from .logging import LOGGING

DEBUG = False

ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",")

if not ALLOWED_HOSTS or ALLOWED_HOSTS == [""]:
    raise RuntimeError("DJANGO_ALLOWED_HOSTS must be set")

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"

LOGGING["root"]["level"] = "WARNING"
