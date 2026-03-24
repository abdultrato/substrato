from django.db.models.signals import pre_save
from django.dispatch import receiver

from infrastructure.middleware.request_user import get_current_user
from core.models.base import AuditModel


@receiver(pre_save)
def populate_audit_fields(sender, instance, **kwargs):
    """
    Preenche criado_por e atualizado_por automaticamente.
    """

    if not issubclass(sender, AuditModel):
        return

    user = get_current_user()

    if not user or not user.is_authenticated:
        return

    if not instance.pk and hasattr(instance, "criado_por"):
        instance.criado_por = user

    if hasattr(instance, "atualizado_por"):
        instance.atualizado_por = user


preencher_auditoria = populate_audit_fields
