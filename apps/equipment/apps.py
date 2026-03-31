"""Configuração da aplicação de equipamentos hospitalares."""

from django.apps import AppConfig


class EquipmentConfig(AppConfig):
    """Metadados exibidos no Django admin."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.equipment"
    label = "equipamentos"
    verbose_name = "Equipamentos do Hospital"
