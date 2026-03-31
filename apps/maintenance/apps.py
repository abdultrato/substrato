from django.apps import AppConfig


class MaintenanceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.maintenance"  # Caminho da app
    label = "manutencoes"  # Label curto para DB/migrations
    verbose_name = "Manutenções e Calibrações de Equipamentos"  # Nome no admin
