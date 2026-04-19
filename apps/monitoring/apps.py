from django.apps import AppConfig


class MonitoringConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.monitoring"  # Caminho da app
    label = "monitoramento"  # Label curto para DB/migrations
    verbose_name = "Monitoramento e Indicadores de Saúde"  # Nome exibido no admin
