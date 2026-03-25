from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class TenantSubscription(NoNameCoreModel):
    class Status(models.TextChoices):
        ATIVA = "ATIVA", "Ativa"
        CANCELADA = "CANCELADA", "Cancelada"

    class Ciclo(models.TextChoices):
        MENSAL = "MENSAL", "Mensal"
        ANUAL = "ANUAL", "Anual"

    prefix = "ASS"

    tenant = models.ForeignKey(
        "inquilinos.Tenant",
        db_column="inquilino_id",
        on_delete=models.CASCADE,
        related_name="assinaturas",
        db_index=True,
    )
    plan = models.ForeignKey(
        "inquilinos.SubscriptionPlan",
        db_column="plano_id",
        on_delete=models.PROTECT,
        related_name="assinaturas",
        db_index=True,
    )

    start_date = models.DateField(

        db_column="data_inicio",

        default=timezone.localdate, db_index=True)
    end_date = models.DateField(
        db_column="data_fim",
        blank=True, null=True)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ATIVA,
        db_index=True,
    )
    cycle = models.CharField(
        db_column="ciclo",
        max_length=10,
        choices=Ciclo.choices,
        default=Ciclo.MENSAL,
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

    def cancelar(self, end_date=None):
        self.status = TenantSubscription.Status.CANCELADA
        self.end_date = end_date or timezone.localdate()
        self.save(update_fields=["status", "end_date"])

    def __str__(self) -> str:
        return f"{self.tenant_id} -> {self.plan_id} ({self.status})"
