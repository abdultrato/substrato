from contextlib import suppress

from django.apps import AppConfig


class IdentityConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.identity"
    label = "identidade"

    def ready(self):
        # Garantir sincronização automática de flags (staff/superuser) via signals.
        with suppress(Exception):
            from . import signals  # noqa: F401
