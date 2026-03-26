from django.apps import AppConfig


class EquipmentIntegrationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.equipment_integrations"
    label = "integracoes_equipamentos"
    verbose_name = "Integrações de Equipamentos com o Sistema"

    def ready(self):
        # Register signals.
        from . import signals  # noqa: F401
