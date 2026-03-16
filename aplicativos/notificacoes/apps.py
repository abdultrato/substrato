from django.apps import AppConfig


class NotificacoesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.notificacoes"
    verbose_name = "Notificações"

    def ready(self) -> None:
        # Registra signals do app.
        from . import sinais  # noqa: F401
