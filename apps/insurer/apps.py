from django.apps import AppConfig


class InsurerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.insurer"  # Caminho da app
    label = "seguradora"  # Label curto para DB/migrations
    verbose_name = "Seguradoras de Saúde e Planos de Saúde"  # Nome exibido no admin
