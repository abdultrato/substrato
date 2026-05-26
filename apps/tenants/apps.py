from django.apps import AppConfig


class TenantsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.tenants"  # Caminho da app
    label = "inquilinos"  # Label curto para DB/migrations
    verbose_name = "Clientes e Unidades Hospitalares"  # Nome exibido no admin
