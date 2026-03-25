class TenantPropagationMixin:
    """
    Automatically propagates the tenant from a related object.
    """

    fonte_tenant = None

    def resolve_tenant(self):
        if not self.fonte_tenant:
            return None

        obj = getattr(self, self.fonte_tenant, None)

        if not obj:
            return None

        return getattr(obj, "tenant", None)

    def save(self, *args, **kwargs):
        if not getattr(self, "tenant", None):
            tenant = self.resolve_tenant()

            if tenant:
                self.tenant = tenant

        super().save(*args, **kwargs)


PropagarInquilinoMixin = TenantPropagationMixin
TenantPropagationMixin.resolver_tenant = TenantPropagationMixin.resolve_tenant
