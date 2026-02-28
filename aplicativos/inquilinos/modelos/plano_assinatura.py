from decimal import Decimal
from django.db import models

from nucleo.modelos.base import InqCoreModel


class PlanoAssinatura(InqCoreModel):
    """
    Plano SaaS global da plataforma.

    ✔ Catálogo compartilhado
    ✔ Não pertence a tenant
    ✔ Usado por AssinaturaTenant
    """

    prefixo = "PA"

    class TipoPlano(models.TextChoices):
        FREE = "FREE", "Free"
        PRO = "PRO", "Pro"
        ENTERPRISE = "ENTERPRISE", "Enterprise"

    tipo = models.CharField(
        max_length=20,
        choices=TipoPlano.choices,
        unique=True,
        db_index=True,
    )

    # =============================
    # LIMITES
    # =============================

    limite_usuarios = models.PositiveIntegerField(default=5)
    limite_requisicoes_mes = models.PositiveIntegerField(default=100)

    # =============================
    # PREÇOS
    # =============================

    preco_mensal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    preco_excedente_requisicao = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("2.00"),
    )

    # =============================
    # FEATURES
    # =============================

    suporte_prioritario = models.BooleanField(default=False)
    permite_multi_unidade = models.BooleanField(default=False)

    ativo = models.BooleanField(
        default=True,
        db_index=True,
    )

    class Meta:
        verbose_name = "Plano"
        verbose_name_plural = "Planos"
        ordering = ["preco_mensal"]
        indexes = [
            models.Index(fields=["tipo"]),
            models.Index(fields=["ativo"]),
        ]

    # =============================
    # REGRAS
    # =============================

    def calcular_excedente(self, total_requisicoes):
        """
        Calcula valor de excedente baseado no uso.
        """
        if total_requisicoes <= self.limite_requisicoes_mes:
            return Decimal("0.00")

        excedente = total_requisicoes - self.limite_requisicoes_mes
        return excedente * self.preco_excedente_requisicao

    def __str__(self):
        return f"{self.tipo} - {self.preco_mensal} MZN"
