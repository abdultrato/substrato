"""Mixin abstrato para escopo multi-tenant (seta tenant a partir do contexto)."""

from django.db import models

from infrastructure.context.tenant import get_tenant


class TenantMixin(models.Model):
    tenant = models.ForeignKey(
        "inquilinos.Tenant",
        db_column="tenant_id",
        on_delete=models.PROTECT,
        related_name="%(class)ss",
        db_index=True,
    )

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["tenant"]),
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Admin/serializers run full_clean() before save(). If tenant is only set
        # in save(), unique constraints scoped by tenant are validated with a NULL
        # tenant and may crash later with IntegrityError. Hydrate tenant early
        # from the request ContextVar when available.
        if not getattr(self, "tenant_id", None):
            tenant = get_tenant()
            if tenant:
                self.tenant = tenant

    def save(self, *args, **kwargs):
        if not self.tenant_id:
            tenant = get_tenant()
            if tenant:
                self.tenant = tenant

        super().save(*args, **kwargs)
