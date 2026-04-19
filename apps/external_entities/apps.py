"""Configuração da aplicação de entidades externas/internas."""

from django.apps import AppConfig


class ExternalEntitiesConfig(AppConfig):
    """Metadados usados pelo Django admin."""

    default_auto_field = "django.db.models.BigAutoField"  # IDs auto incrementais
    name = "apps.external_entities"  # Caminho da app
    label = "entidades"  # Label curto usado em migrações
    verbose_name = "Entidades Internas e Externas"  # Nome exibido no admin
