from django.apps import AppConfig

class NotificacoesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.notificacoes"
    verbose_name = "Notificações"

    def ready(self):
        import aplicativos.notificacoes.sinais
