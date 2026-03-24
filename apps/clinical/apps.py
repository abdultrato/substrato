from django.apps import AppConfig


class ClinicalConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.clinical"
    label = "clinico"
    verbose_name = "Laboratório"

    def ready(self):
        from events.registry import register_handlers

        register_handlers()
