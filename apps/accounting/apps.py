from django.apps import AppConfig


class AccountingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounting"
    label = "contabilidade"
    verbose_name = "Contabilidade e Gestão Financeira"
