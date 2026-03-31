"""Configuração da aplicação de contabilidade."""

from django.apps import AppConfig


class AccountingConfig(AppConfig):
    """Define metadados e rótulos usados no Django admin."""

    default_auto_field = "django.db.models.BigAutoField"  # Tipo padrão de chave
    name = "apps.accounting"  # Caminho da app
    label = "contabilidade"  # Label curto usado em FK
    verbose_name = "Contabilidade e Gestão Financeira"  # Nome exibido no admin
