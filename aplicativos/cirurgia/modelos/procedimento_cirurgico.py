from __future__ import annotations

from decimal import Decimal

from django.db import models

from infrastrutura.orm.fields.dinheiro_field import DinheiroField

from nucleo.modelos.base import CoreModel


class ProcedimentoCirurgico(CoreModel):
    """
    Catálogo de procedimentos cirúrgicos.

    Usado para padronizar o campo "procedimento" na cirurgia e permitir
    múltiplos procedimentos na mesma cirurgia.
    """

    prefixo = "PCIR"

    descricao = models.TextField(
        verbose_name="Descrição",
        blank=True,
        default="",
    )

    preco_base = DinheiroField(
        verbose_name="Preço base",
        default=Decimal("0.00"),
    )

    iva_percentual = models.DecimalField(
        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("16.00"),
    )

    aplica_iva_por_padrao = models.BooleanField(
        verbose_name="Aplicar IVA por padrão",
        default=True,
    )

    ativo = models.BooleanField(
        verbose_name="Ativo",
        default=True,
        db_index=True,
    )

    class Meta:
        verbose_name = "Procedimento Cirúrgico"
        verbose_name_plural = "Procedimentos Cirúrgicos"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["inquilino", "ativo", "nome"]),
        ]

    def __str__(self) -> str:
        return self.nome or f"Procedimento Cirúrgico {self.pk}"
