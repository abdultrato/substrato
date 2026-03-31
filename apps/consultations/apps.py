"""Configuração da aplicação de consultas médicas."""

from django.apps import AppConfig


class ConsultationsConfig(AppConfig):
    """Metadados exibidos no admin para o módulo de consultas."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.consultations"
    label = "consultas"
    verbose_name = "Consultas Médicas"
