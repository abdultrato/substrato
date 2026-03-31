from contextlib import suppress

from django.apps import AppConfig


class IdentityConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.identity"  # Caminho da app
    label = "identidade"  # Label curto usado nas migrations/DB
    verbose_name = "Identidade e Acesso do Usuário"  # Nome no admin

    def ready(self):
        # Garante sincronização automática de flags (staff/superuser) via signals.
        with suppress(Exception):
            from . import signals  # noqa: F401
