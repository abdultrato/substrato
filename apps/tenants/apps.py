from django.apps import AppConfig


class TenantsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.tenants"  # Caminho da app
    label = "inquilinos"  # Label curto para DB/migrations
    verbose_name = "Inquilinos e Locações de Hospitais"  # Nome exibido no admin
