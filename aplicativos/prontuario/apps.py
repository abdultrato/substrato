from contextlib import suppress

from django.apps import AppConfig


class ProntuarioConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.prontuario"
    verbose_name = "Prontuário"

    def ready(self):
        # Registrar sinais do app (ex.: sincronização Cardex <-> Consultas).
        with suppress(Exception):
            from . import sinais  # noqa: F401
