from django.core.exceptions import ValidationError


class TenantPropagationMixin:
    """Propaga automaticamente o tenant de um campo relacionado (`tenant_source`)."""

    tenant_source = None

    def resolve_tenant(self):
        if not self.tenant_source:
            return None

        source_object = getattr(self, self.tenant_source, None)

        if not source_object:
            return None

        return getattr(source_object, "tenant", None)

    def _sync_or_validate_tenant_from_source(self):
        tenant = self.resolve_tenant()
        if not tenant:
            return

        if not getattr(self, "tenant_id", None):
            self.tenant = tenant
            return

        if self.tenant_id != tenant.pk:
            raise ValidationError(
                {
                    "tenant": (
                        f"Inquilino de {self.__class__.__name__} difere do "
                        f"inquilino de {self.tenant_source}."
                    )
                }
            )

    def clean(self):
        super().clean()
        self._sync_or_validate_tenant_from_source()

    def save(self, *args, **kwargs):
        self.clean()

        super().save(*args, **kwargs)
