from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.notifications"  # Caminho da app
    label = "notificacoes"  # Label curto para DB/migrations
    verbose_name = "Notificações e Alertas"  # Nome exibido no admin

    def ready(self) -> None:
        # Registra signals do app.
        from . import signals  # noqa: F401
