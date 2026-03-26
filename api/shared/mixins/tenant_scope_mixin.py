from api.v1.viewset_mixins import TenantScopedQuerysetMixin

TenantScopeMixin = TenantScopedQuerysetMixin

__all__ = ["TenantScopeMixin", "TenantScopedQuerysetMixin"]
