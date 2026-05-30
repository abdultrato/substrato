"""ASGI entrypoint para o runtime HTTP concorrente do Substrato."""

# ruff: noqa: I001
import os

from django.core.asgi import get_asgi_application

import sitecustomize  # noqa: F401
from observability.opentelemetry import inicializar_opentelemetry

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "platform.settings")

inicializar_opentelemetry()

application = get_asgi_application()
