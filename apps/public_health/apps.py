from django.apps import AppConfig


class PublicHealthConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.public_health"
    label = "saude_publica"
    verbose_name = "Imunização e Saúde Pública"
