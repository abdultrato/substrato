from django.apps import AppConfig


class SurgeryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.surgery"  # Caminho da app
    label = "cirurgia"  # Label curto para DB/migrations
    verbose_name = "Cirurgias e Procedimentos Cirúrgicos"  # Nome exibido no admin
