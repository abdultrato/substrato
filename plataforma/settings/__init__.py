# default settings
import os
from django.apps import AppConfig
from . import security, base

ambiente = os.getenv("DJANGO_ENV", "development")

if ambiente == "production":
    from .production import *
else:
    from .development import *


class IdentidadeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.identidade"
