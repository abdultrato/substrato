from django.apps import AppConfig


class HumanResourcesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.human_resources"  # Caminho da app
    label = "recursos_humanos"  # Label curto usado em migrações/DB
    verbose_name = "Recursos Humanos"  # Nome exibido no admin
