class TenantPropagationMixin:
    """
    Automatically propagates the tenant from a related object.
    """

    tenant_source = None

    def resolve_tenant(self):
        if not self.tenant_source:
            return None

        source_object = getattr(self, self.tenant_source, None)

        if not source_object:
            return None

        return getattr(source_object, "tenant", None)

    def save(self, *args, **kwargs):
        if not getattr(self, "tenant", None):
            tenant = self.resolve_tenant()

            if tenant:
                self.tenant = tenant

        super().save(*args, **kwargs)
