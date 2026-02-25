from django.apps import AppConfig

class ContabilidadeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.contabilidade"
    verbose_name = "Contabilidade"

    def ready(self):
        import aplicativos.contabilidade.sinais
