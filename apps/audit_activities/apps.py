from django.apps import AppConfig


class AuditActivitiesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.audit_activities"
    label = "auditoria_atividades"
    verbose_name = "Auditoria de Actividades"
