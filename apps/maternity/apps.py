from django.apps import AppConfig


class MaternityConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.maternity"  # Caminho da app
    label = "maternidade"  # Label curto para migrations/DB
    verbose_name = "Maternidade | Obstetrícia | Neonatologia"  # Nome no admin
