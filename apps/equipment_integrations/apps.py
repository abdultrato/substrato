"""Configuração da aplicação de integrações com equipamentos."""

from django.apps import AppConfig


class EquipmentIntegrationsConfig(AppConfig):
    """Metadados e registro de sinais para integrações de equipamentos."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.equipment_integrations"
    label = "integracoes_equipamentos"
    verbose_name = "Integrações de Equipamentos com o Sistema"

    def ready(self):
        """Registra sinais ao iniciar a app."""
        from . import signals  # noqa: F401
