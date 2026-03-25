from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class TenantSubscription(NoNameCoreModel):
    class Status(models.TextChoices):
        ACTIVE = "ATIVA", "Ativa"
        CANCELED = "CANCELADA", "Cancelada"

    class BillingCycle(models.TextChoices):
        MONTHLY = "MENSAL", "Mensal"
        YEARLY = "ANUAL", "Anual"

    prefix = "ASS"

    tenant = models.ForeignKey(
        "inquilinos.Tenant",
        db_column="tenant_id",
        on_delete=models.CASCADE,
        related_name="assinaturas",
        db_index=True,
    )
    plan = models.ForeignKey(
        "inquilinos.SubscriptionPlan",
        db_column="plan_id",
        on_delete=models.PROTECT,
        related_name="assinaturas",
        db_index=True,
    )

    start_date = models.DateField(

        db_column="start_date",

        default=timezone.localdate, db_index=True)
    end_date = models.DateField(
        db_column="end_date",
        blank=True, null=True)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    cycle = models.CharField(
        db_column="cycle",
        max_length=10,
        choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY,
        db_index=True,
    )

    class Meta:
        db_table = "inquilinos_assinaturatenant"
        verbose_name = "Assinatura"
        verbose_name_plural = "Assinaturas"
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
        ]

    def cancel(self, end_date=None):
        self.status = TenantSubscription.Status.CANCELED
        self.end_date = end_date or timezone.localdate()
        self.save(update_fields=["status", "end_date"])

    def __str__(self) -> str:
        return f"{self.tenant_id} -> {self.plan_id} ({self.status})"
