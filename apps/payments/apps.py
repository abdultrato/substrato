from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.payments"  # Caminho da app
    label = "pagamentos"  # Label curto para DB/migrations
    verbose_name = "Pagamentos e Gerenciamento Financeiro"  # Nome exibido no admin
