"""Especialidade de consulta com preço base e IVA."""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models.base import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class ConsultationSpecialty(CoreModel):
    """
    Especialidade / tipo de consulta com preço base.

    O frontend usa esta tabela como "choices" na marcação.
    """

    prefix = "ESP"  # Prefixo para IDs amigáveis

    description = models.TextField(

        db_column="description",

        verbose_name="Descrição", blank=True, default="")

    base_price = MoneyField(

        db_column="base_price",

        verbose_name="Preço base", default=Decimal("0.00"))

    vat_percentage = models.DecimalField(

        db_column="vat_percentage",

        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("16.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Taxa de IVA aplicada ao serviço de consulta (0 a 100).",
    )

    active = models.BooleanField(

        db_column="active",

        verbose_name="Ativo", default=True, db_index=True)

    class Meta:
        db_table = "consultas_especialidadeconsulta"
        verbose_name = "Especialidade (Consulta)"
        verbose_name_plural = "Especialidades (Consulta)"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "active", "name"]),
        ]

    def clean(self):
        super().clean()

        if not (self.name or "").strip():
            raise ValidationError({"name": "Informe o name da specialty."})

        if self.base_price is None or self.base_price < Decimal("0.00"):
            raise ValidationError({"base_price": "Preço base inválido."})

    def __str__(self) -> str:
        return self.name

    def activate(self):
        """Reativa a especialidade para novos agendamentos (§19.5)."""
        self.active = True
        self.save(update_fields=["active", "updated_at"])
        return self

    def deactivate(self):
        """Inativa a especialidade — deixa de ser oferecida em novas consultas."""
        self.active = False
        self.save(update_fields=["active", "updated_at"])
        return self

