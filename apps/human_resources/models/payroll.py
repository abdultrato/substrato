from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum

from infrastructure.orm.fields.dinheiro_field import DinheiroField
from core.models.base import NoNameCoreModel


class Payroll(NoNameCoreModel):
    """
    Monthly payroll per employee (MVP).
    """

    prefixo = "FPG"

    funcionario = models.ForeignKey(
        "recursos_humanos.Employee",
        on_delete=models.CASCADE,
        related_name="folhas_pagamento",
        db_index=True,
    )

    ano = models.PositiveSmallIntegerField(db_index=True)
    mes = models.PositiveSmallIntegerField(db_index=True)

    salario_nominal = DinheiroField(default=Decimal("0.00"))
    horas_base_mes = models.PositiveSmallIntegerField(default=176)
    multiplicador_hora_extra = models.DecimalField(max_digits=4, decimal_places=2, default=Decimal("1.50"))

    horas_extras_apuradas = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    valor_hora = models.DecimalField(max_digits=12, decimal_places=4, default=Decimal("0.0000"))
    valor_horas_extras = DinheiroField(default=Decimal("0.00"))
    salario_total = DinheiroField(default=Decimal("0.00"))

    fechado = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = "Folha de Pagamento"
        verbose_name_plural = "Folhas de Pagamento"
        ordering = ["-ano", "-mes", "-criado_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["inquilino", "funcionario", "ano", "mes"],
                name="uniq_folha_por_funcionario_mes",
            )
        ]
        indexes = [
            models.Index(fields=["inquilino", "ano", "mes"]),
            models.Index(fields=["inquilino", "funcionario", "ano", "mes"]),
        ]

    def clean(self):
        super().clean()

        if self.funcionario_id and self.inquilino_id and self.funcionario.inquilino_id != self.inquilino_id:
            raise ValidationError({"funcionario": "Funcionário e folha devem pertencer ao mesmo inquilino."})

        if not (1 <= int(self.mes or 0) <= 12):
            raise ValidationError({"mes": "Mês inválido (1-12)."})

        if self.salario_nominal is not None and self.salario_nominal < Decimal("0.00"):
            raise ValidationError({"salario_nominal": "Salário nominal inválido."})

        if self.horas_base_mes <= 0:
            raise ValidationError({"horas_base_mes": "Horas base do mês deve ser > 0."})

        if self.multiplicador_hora_extra <= Decimal("0.00"):
            raise ValidationError({"multiplicador_hora_extra": "Multiplicador de hora extra inválido."})

    def _calculate_overtime_hours(self) -> Decimal:
        from .overtime import Overtime

        qs = Overtime.objects.filter(
            inquilino=self.inquilino,
            funcionario=self.funcionario,
            data__year=self.ano,
            data__month=self.mes,
            deletado=False,
        )
        raw = qs.aggregate(total=Sum("horas")).get("total") or Decimal("0.00")
        return Decimal(raw)

    def recalculate(self):
        # If not provided, synchronize salary/base hours from the employee.
        if self.funcionario_id:
            if self.salario_nominal is None:
                # Includes promotions and salary increases in the effective salary.
                salario_atual = getattr(self.funcionario, "salario_atual", None)
                self.salario_nominal = salario_atual if salario_atual is not None else self.funcionario.salario_nominal
            if not self.horas_base_mes:
                self.horas_base_mes = self.funcionario.horas_base_mes or 176

        horas_extras = self._calculate_overtime_hours() if self.funcionario_id and self.inquilino_id else Decimal("0.00")
        self.horas_extras_apuradas = horas_extras

        valor_hora = Decimal("0.0000")
        if self.horas_base_mes and self.salario_nominal is not None:
            valor_hora = (Decimal(self.salario_nominal) / Decimal(self.horas_base_mes)).quantize(Decimal("0.0000"))
        self.valor_hora = valor_hora

        valor_extra = (horas_extras * valor_hora * Decimal(self.multiplicador_hora_extra)).quantize(Decimal("0.01"))
        self.valor_horas_extras = valor_extra

        total = (Decimal(self.salario_nominal) + valor_extra).quantize(Decimal("0.01"))
        self.salario_total = total

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.funcionario_id:
            self.inquilino_id = self.funcionario.inquilino_id
        # Always recalculate to keep the aggregate consistent.
        self.recalculate()
        self.full_clean()
        return super().save(*args, **kwargs)


Payroll._apuracao_horas_extras = Payroll._calculate_overtime_hours
Payroll.recalcular = Payroll.recalculate
