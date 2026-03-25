# LOCAL: nucleo/mixins/escopo_tenant.py

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

    def save(self, *args, **kwargs):
        if not self.tenant_id:
            tenant = get_tenant()
            if tenant:
                self.tenant = tenant

        super().save(*args, **kwargs)
