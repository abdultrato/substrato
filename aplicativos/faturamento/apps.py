from django.apps import AppConfig

class FaturamentoConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.faturamento"
    verbose_name = "Faturamento"

    def ready(self):
        import aplicativos.faturamento.sinais
