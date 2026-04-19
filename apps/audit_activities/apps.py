"""Configuração da aplicação de auditoria de atividades."""

from django.apps import AppConfig


class AuditActivitiesConfig(AppConfig):
    """Metadados exibidos no Django admin."""

    default_auto_field = "django.db.models.BigAutoField"  # Tipo padrão de chave
    name = "apps.audit_activities"  # Caminho da app
    label = "auditoria_atividades"  # Label curto para referências
    verbose_name = "Auditoria de Atividades do Sistema"  # Nome exibido no admin
