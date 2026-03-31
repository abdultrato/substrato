from django.apps import AppConfig


class InspectionsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.inspections"  # Caminho da app
    label = "inspecoes"  # Label curto usado em migrações/DB
    verbose_name = "Inspeções de Segurança e Manutenção"  # Nome exibido no admin
