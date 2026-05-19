"""Configuração da aplicação de farmácia."""

from contextlib import suppress

from django.apps import AppConfig


class PharmacyConfig(AppConfig):
    """Define metadados da app e registra sinais."""

    default_auto_field = "django.db.models.BigAutoField"  # Tipo padrão de chave
    name = "apps.pharmacy"  # Caminho da app
    label = "farmacia"  # Rótulo curto usado em ForeignKeys
    verbose_name = "Farmácia e Gestão de Estoque"  # Nome exibido no admin

    def ready(self):
        """Carrega sinais ao iniciar a app."""
        # Registra sinais de estoque (ex.: entrada automática ao criar lote).
        with suppress(Exception):
            from . import signals  # noqa: F401  # Import para disparar registradores
