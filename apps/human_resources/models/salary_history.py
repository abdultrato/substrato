from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField


class SalaryHistory(NoNameCoreModel):
    """Histórico de salários do funcionário com vigência temporal."""

    prefix = "HSL"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="historico_salarial",
        db_index=True,
    )
    amount = MoneyField(
        db_column="amount",
        verbose_name="Valor do salário",
        default=Decimal("0.00"),
    )
    effective_from = models.DateField(
        db_column="effective_from",
        verbose_name="Vigente a partir de",
        db_index=True,
    )
    effective_until = models.DateField(
        db_column="effective_until",
        verbose_name="Vigente até",
        null=True,
        blank=True,
        db_index=True,
    )
    is_current = models.BooleanField(
        db_column="is_current",
        verbose_name="Salário atual",
        default=False,
        db_index=True,
    )
    reason = models.TextField(
        db_column="reason",
        verbose_name="Motivo da alteração",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "recursos_humanos_historico_salarial"
        verbose_name = "Histórico Salarial"
        verbose_name_plural = "Histórico Salarial"
        ordering = ["-effective_from", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "employee", "effective_from"]),
            models.Index(fields=["tenant", "employee", "is_current"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e histórico salarial devem pertencer ao mesmo tenant."})
        if self.amount is not None and self.amount < Decimal("0.00"):
            raise ValidationError({"amount": "Valor do salário inválido."})
        if self.effective_from and self.effective_until and self.effective_from > self.effective_until:
            raise ValidationError({"effective_until": "Data de fim de vigência não pode ser anterior à data de início."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        # Se este registo é marcado como atual, desmarcar os anteriores
        if self.is_current and self.employee_id:
            type(self).objects.filter(
                tenant=self.tenant,
                employee_id=self.employee_id,
                is_current=True,
                deleted=False,
            ).exclude(pk=self.pk).update(is_current=False)
        self.full_clean()
        return super().save(*args, **kwargs)
