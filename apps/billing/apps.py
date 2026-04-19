"""Configuração da aplicação de faturamento."""

from django.apps import AppConfig


class BillingConfig(AppConfig):
    """Metadados usados pelo Django admin."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.billing"
    label = "faturamento"
    verbose_name = "Faturamentos e Pagamentos Médicos"
