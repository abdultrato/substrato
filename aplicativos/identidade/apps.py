from contextlib import suppress

from django.apps import AppConfig


class IdentidadeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.identidade"

    def ready(self):
        # Garantir sincronização automática de flags (staff/superuser) via sinais.
        with suppress(Exception):
            from . import sinais  # noqa: F401
