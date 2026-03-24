class TenantPropagationMixin:
    """
    Automatically propagates the tenant from a related object.
    """

    fonte_inquilino = None

    def resolve_tenant(self):
        if not self.fonte_inquilino:
            return None

        obj = getattr(self, self.fonte_inquilino, None)

        if not obj:
            return None

        return getattr(obj, "inquilino", None)

    def save(self, *args, **kwargs):
        if not getattr(self, "inquilino", None):
            inquilino = self.resolve_tenant()

            if inquilino:
                self.inquilino = inquilino

        super().save(*args, **kwargs)


PropagarInquilinoMixin = TenantPropagationMixin
TenantPropagationMixin.resolver_inquilino = TenantPropagationMixin.resolve_tenant
