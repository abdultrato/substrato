from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class Profession(CoreModel):
    """
    Profissão padrão para normalizar regras salariais no RH.
    """

    prefix = "PRF"

    description = models.TextField(
        db_column="description",
        verbose_name="Descrição",
        blank=True,
        default="",
    )
    base_salary = MoneyField(
        db_column="base_salary",
        verbose_name="Salário Base",
        default=Decimal("0.00"),
    )
    ordinary_hour_value = models.DecimalField(
        db_column="ordinary_hour_value",
        verbose_name="Valor Hora Ordinária",
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
    )
    extraordinary_hour_value = models.DecimalField(
        db_column="extraordinary_hour_value",
        verbose_name="Valor Hora Extraordinária",
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
    )
    minimum_progression_months = models.PositiveSmallIntegerField(
        db_column="minimum_progression_months",
        verbose_name="Período mínimo de progressão (meses)",
        default=12,
    )
    minimum_career_change_months = models.PositiveSmallIntegerField(
        db_column="minimum_career_change_months",
        verbose_name="Período mínimo de mudança de carreira (meses)",
        default=24,
    )
    family_allowance_per_dependent = MoneyField(
        db_column="family_allowance_per_dependent",
        verbose_name="Aumento por agregado familiar",
        default=Decimal("0.00"),
        help_text="Valor adicional por cada agregado familiar ativo do funcionário.",
    )
    active = models.BooleanField(
        db_column="active",
        verbose_name="Ativa",
        default=True,
        db_index=True,
    )

    class Meta:
        db_table = "recursos_humanos_profissao"
        verbose_name = "Profissão"
        verbose_name_plural = "Profissões"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "active"]),
        ]

    def clean(self):
        super().clean()

        if self.base_salary is not None and self.base_salary < Decimal("0.00"):
            raise ValidationError({"base_salary": "Salário base inválido."})

        if self.ordinary_hour_value is not None and self.ordinary_hour_value < Decimal("0.0000"):
            raise ValidationError({"ordinary_hour_value": "Valor de hora ordinária inválido."})

        if self.extraordinary_hour_value is not None and self.extraordinary_hour_value < Decimal("0.0000"):
            raise ValidationError({"extraordinary_hour_value": "Valor de hora extraordinária inválido."})

        if self.minimum_progression_months <= 0:
            raise ValidationError({"minimum_progression_months": "Período mínimo de progressão deve ser > 0."})

        if self.minimum_career_change_months <= 0:
            raise ValidationError(
                {"minimum_career_change_months": "Período mínimo de mudança de carreira deve ser > 0."}
            )

        if self.family_allowance_per_dependent is not None and self.family_allowance_per_dependent < Decimal("0.00"):
            raise ValidationError({"family_allowance_per_dependent": "Aumento por agregado familiar inválido."})
