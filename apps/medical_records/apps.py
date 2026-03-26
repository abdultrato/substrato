from contextlib import suppress

from django.apps import AppConfig


class MedicalRecordsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.medical_records"
    label = "prontuario"
    verbose_name = "Prontuário Médico"

    def ready(self):
        # Registrar signals do app (ex.: sincronização Cardex <-> Consultas).
        with suppress(Exception):
            from . import signals  # noqa: F401
