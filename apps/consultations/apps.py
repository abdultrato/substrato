from django.apps import AppConfig


class ConsultationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.consultations"
    label = "consultas"
    verbose_name = "Consultas Médicas"
