from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"
    label = "notificacoes"
    verbose_name = "Notificações e Alertas"

    def ready(self) -> None:
        # Registra signals do app.
        from . import signals  # noqa: F401
