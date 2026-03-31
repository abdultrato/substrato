"""Fornece escopo multi-tenant para entidades de domínio."""

from core.mixins.tenant_scope import TenantMixin

TenantScopeMixin = TenantMixin

__all__ = ["TenantMixin", "TenantScopeMixin"]
