from django.db import models
from django.utils import timezone
from django.db.models import Q

from nucleo.modelos.base import InqCoreModel
from .plano_assinatura import PlanoAssinatura


class AssinaturaTenant(InqCoreModel):
    """
    Assinatura de um tenant a um plano SaaS.

    ✔ Apenas uma ativa por tenant
    ✔ Histórico preservado
    ✔ Compatível com billing
    ✔ Suporta upgrade/downgrade
    """

    prefixo = "ASSIN"

    # =====================================================
    # RELACIONAMENTO
    # =====================================================

    inquilino = models.ForeignKey(
        "inquilinos.Inquilino",
        on_delete=models.CASCADE,
        related_name="assinaturas",
    )

    plano = models.ForeignKey(
        PlanoAssinatura,
        on_delete=models.PROTECT,
        related_name="assinaturas",
    )

    # =====================================================
    # PERÍODO
    # =====================================================

    data_inicio = models.DateField(default=timezone.now)
    data_fim = models.DateField(null=True, blank=True)

    # =====================================================
    # CICLO
    # =====================================================

    class Ciclo(models.TextChoices):
        MENSAL = "MENSAL", "Mensal"
        ANUAL = "ANUAL", "Anual"

    ciclo = models.CharField(
        max_length=10,
        choices=Ciclo.choices,
        default=Ciclo.MENSAL,
    )

    # =====================================================
    # STATUS
    # =====================================================

    class Status(models.TextChoices):
        ATIVA = "ATIVA", "Ativa"
        CANCELADA = "CANCELADA", "Cancelada"
        EXPIRADA = "EXPIRADA", "Expirada"

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ATIVA,
        db_index=True,
    )

    renovacao_automatica = models.BooleanField(default=True)

    # =====================================================
    # META
    # =====================================================

    class Meta:
        verbose_name = "Assinatura"
        verbose_name_plural = "Assinaturas"
        indexes = [
            models.Index(fields=["inquilino", "status"]),
            models.Index(fields=["status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["inquilino"],
                condition=Q(status="ATIVA"),
                name="unique_assinatura_ativa_por_tenant",
            )
        ]

    # =====================================================
    # REGRAS
    # =====================================================

    def esta_ativa(self):
        """
        Verifica se assinatura está ativa considerando status e data.
        """

        if self.status != self.Status.ATIVA:
            return False

        if self.data_fim and self.data_fim < timezone.now().date():
            return False

        return True

    def cancelar(self, data_fim=None):
        """
        Cancela assinatura.
        """

        self.status = self.Status.CANCELADA
        self.data_fim = data_fim or timezone.now().date()
        self.save(update_fields=["status", "data_fim"])

    def expirar(self):
        """
        Marca como expirada.
        """

        self.status = self.Status.EXPIRADA
        self.save(update_fields=["status"])

    def __str__(self):
        return f"{self.inquilino.nome} - {self.plano.tipo} ({self.status})"
