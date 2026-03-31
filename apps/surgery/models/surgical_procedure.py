from __future__ import annotations

from decimal import Decimal

from django.db import models

from core.models.base import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class SurgicalProcedure(CoreModel):
    """Catálogo de procedimentos cirúrgicos usados nas cirurgias."""

    prefix = "PCIR"

    description = models.TextField(

        db_column="description",

        verbose_name="Descrição",
        blank=True,
        default="",
    )

    base_price = MoneyField(

        db_column="base_price",

        verbose_name="Preço base",
        default=Decimal("0.00"),
    )

    vat_percentage = models.DecimalField(

        db_column="vat_percentage",

        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("16.00"),
    )

    applies_vat_by_default = models.BooleanField(

        db_column="applies_vat_by_default",

        verbose_name="Aplicar IVA por padrão",
        default=True,
    )

    active = models.BooleanField(

        db_column="active",

        verbose_name="Ativo",
        default=True,
        db_index=True,
    )

    class Meta:
        db_table = "cirurgia_procedimentocirurgico"
        verbose_name = "Procedimento Cirúrgico"
        verbose_name_plural = "Procedimentos Cirúrgicos"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "active", "name"]),
        ]

    def __str__(self) -> str:
        return self.name or f"Procedimento Cirúrgico {self.pk}"

