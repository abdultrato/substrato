"""WSGI entrypoint para servidores compatíveis (gunicorn, uwsgi)."""

# ruff: noqa: I001
import os

from django.core.wsgi import get_wsgi_application

import sitecustomize  # noqa: F401
from observability.opentelemetry import inicializar_opentelemetry

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "platform.settings")

inicializar_opentelemetry()

application = get_wsgi_application()
