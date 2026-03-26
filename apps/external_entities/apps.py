from django.apps import AppConfig


class ExternalEntitiesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.external_entities"
    label = "entidades"
    verbose_name = "External Entities"
