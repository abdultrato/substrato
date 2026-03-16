from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum

from infrastrutura.orm.fields.dinheiro_field import DinheiroField
from nucleo.modelos.base import NoNameCoreModel


class FolhaPagamento(NoNameCoreModel):
    """
    Folha de pagamento mensal por funcionário (MVP).

    A folha apura horas extras a partir dos registros de HoraExtra do mês.
    Regra (default):
    - valor_hora = salario_nominal / horas_base_mes
    - valor_horas_extras = horas_extras * valor_hora * multiplicador_hora_extra
    - salario_total = salario_nominal + valor_horas_extras
    """

    prefixo = "FPG"

    funcionario = models.ForeignKey(
        "recursos_humanos.Funcionario",
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

    def _apuracao_horas_extras(self) -> Decimal:
        from .hora_extra import HoraExtra

        qs = HoraExtra.objects.filter(
            inquilino=self.inquilino,
            funcionario=self.funcionario,
            data__year=self.ano,
            data__month=self.mes,
            deletado=False,
        )
        raw = qs.aggregate(total=Sum("horas")).get("total") or Decimal("0.00")
        return Decimal(raw)

    def recalcular(self):
        # Se não informado, sincroniza salário/horas base do funcionário.
        if self.funcionario_id:
            if self.salario_nominal is None:
                # Inclui aumentos/promocoes no salário efetivo.
                salario_atual = getattr(self.funcionario, "salario_atual", None)
                self.salario_nominal = salario_atual if salario_atual is not None else self.funcionario.salario_nominal
            if not self.horas_base_mes:
                self.horas_base_mes = self.funcionario.horas_base_mes or 176

        horas_extras = self._apuracao_horas_extras() if self.funcionario_id and self.inquilino_id else Decimal("0.00")
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
        # Sempre recalcula para manter consistência.
        self.recalcular()
        self.full_clean()
        return super().save(*args, **kwargs)
