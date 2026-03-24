# ruff: noqa: F403
#
# default settings
import os

from django.apps import AppConfig

from . import base, security

ambiente = os.getenv("DJANGO_ENV", "development")

if ambiente == "production":
    from .production import *
else:
    from .development import *


class IdentityConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.identity"
