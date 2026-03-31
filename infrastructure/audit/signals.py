"""Signals de auditoria para preencher campos created_by/updated_by."""

from django.db.models.signals import pre_save
from django.dispatch import receiver

from core.models.base import AuditModel
from infrastructure.middleware.request_user import get_current_user


@receiver(pre_save)
def populate_audit_fields(sender, instance, **kwargs):
    """
    Preenche created_by e updated_by automaticamente.
    """

    if not issubclass(sender, AuditModel):
        return

    user = get_current_user()

    if not user or not user.is_authenticated:
        return

    if not instance.pk and hasattr(instance, "created_by"):
        instance.created_by = user

    if hasattr(instance, "updated_by"):
        instance.updated_by = user


preencher_auditoria = populate_audit_fields
