"""Reexporta o mixin de auditoria para uso nos domínios."""

from core.mixins.audit import AuditMixin

AuditFieldsMixin = AuditMixin

__all__ = ["AuditFieldsMixin", "AuditMixin"]
