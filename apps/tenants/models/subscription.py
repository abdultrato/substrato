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

    prefixo = "ASS"

    inquilino = models.ForeignKey(
        "inquilinos.Tenant",
        on_delete=models.CASCADE,
        related_name="assinaturas",
        db_index=True,
    )
    plano = models.ForeignKey(
        "inquilinos.SubscriptionPlan",
        on_delete=models.PROTECT,
        related_name="assinaturas",
        db_index=True,
    )

    data_inicio = models.DateField(default=timezone.localdate, db_index=True)
    data_fim = models.DateField(blank=True, null=True)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ATIVA,
        db_index=True,
    )
    ciclo = models.CharField(
        max_length=10,
        choices=Ciclo.choices,
        default=Ciclo.MENSAL,
        db_index=True,
    )

    class Meta:
        verbose_name = "Assinatura"
        verbose_name_plural = "Assinaturas"
        ordering = ["-data_inicio"]
        indexes = [
            models.Index(fields=["inquilino", "status"]),
        ]

    def cancelar(self, data_fim=None):
        self.status = TenantSubscription.Status.CANCELADA
        self.data_fim = data_fim or timezone.localdate()
        self.save(update_fields=["status", "data_fim"])

    def __str__(self) -> str:
        return f"{self.inquilino_id} -> {self.plano_id} ({self.status})"
