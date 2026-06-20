from contextlib import suppress

from django.apps import AppConfig


class IdentityConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.identity"  # Caminho da app
    label = "identidade"  # Label curto usado nas migrations/DB
    verbose_name = "Identidade e Acesso do Usuário"  # Nome no admin

    def ready(self):
        # Mantém rótulos/verbose names coerentes no Admin com nomes internos em inglês.
        with suppress(Exception):
            from core.utils.verbose_names import aplicar_verbose_names_globais

            aplicar_verbose_names_globais()

        # django.contrib.auth comes before this app in INSTALLED_APPS, so its
        # createsuperuser command would normally win. Force our override into the
        # management command registry before any command is dispatched.
        with suppress(Exception):
            from django.core.management import get_commands

            cmds = get_commands()
            cmds["createsuperuser"] = self.name

        # Garante sincronização automática de flags (staff/superuser) via signals.
        with suppress(Exception):
            from . import signals  # noqa: F401

        # Evita 500 no Admin em violações de integridade (NOT NULL, UNIQUE, FK),
        # convertendo para mensagem amigável no próprio fluxo do admin.
        with suppress(Exception):
            from infrastructure.admin_integrity_guard import install_admin_integrity_guard

            install_admin_integrity_guard()
