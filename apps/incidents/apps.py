from django.apps import AppConfig


class IncidentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.incidents"  # Caminho da app
    label = "ocorrencias"  # Label curto para DB/migrations
    verbose_name = "Incidentes"  # Nome exibido no admin
