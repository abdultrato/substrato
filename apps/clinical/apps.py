"""Configuração da aplicação de serviços clínicos (prontuário e exames)."""

from django.apps import AppConfig


class ClinicalConfig(AppConfig):
    """Metadados e registro de handlers de eventos clínicos."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.clinical"
    label = "clinical"
    verbose_name = "Serviços Clínicos"

    def ready(self):
        """Registra handlers globais de eventos."""
        from events.registry import register_handlers

        register_handlers()
