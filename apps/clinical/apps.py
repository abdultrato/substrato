from django.apps import AppConfig


class ClinicalConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.clinical"
    label = "clinical"
    verbose_name = "Serviço Clínico"

    def ready(self):
        from events.registry import register_handlers

        register_handlers()
