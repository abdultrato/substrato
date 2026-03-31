from contextlib import suppress

from django.apps import AppConfig


class MedicalRecordsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.medical_records"  # Caminho da app
    label = "prontuario"  # Label curto para DB/migrations
    verbose_name = "Prontuário Médico"  # Nome exibido no admin

    def ready(self):
        # Registra signals do app (ex.: sincronização Cardex <-> Consultas).
        with suppress(Exception):
            from . import signals  # noqa: F401
