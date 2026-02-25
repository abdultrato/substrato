from django.apps import AppConfig

class PagamentosConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.pagamentos"
    verbose_name = "Pagamentos"

    def ready(self):
        import aplicativos.pagamentos.sinais
