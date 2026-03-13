from django.apps import AppConfig


class IntegracoesEquipamentosConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.integracoes_equipamentos"
    verbose_name = "Integrações (Equipamentos)"

    def ready(self):
        # Register signals.
        from . import sinais  # noqa: F401
