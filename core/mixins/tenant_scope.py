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

    @property
    def inquilino(self):
        return self.tenant

    @inquilino.setter
    def inquilino(self, value):
        self.tenant = value

    @property
    def inquilino_id(self):
        return self.tenant_id

    @inquilino_id.setter
    def inquilino_id(self, value):
        self.tenant_id = value


InquilinoMixin = TenantMixin
