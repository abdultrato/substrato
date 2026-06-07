from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField


class PayrollRun(NoNameCoreModel):
    """Folha de pagamento de um período (multi-funcionário)."""

    prefix = "FPR"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        CALCULATING = "CALCULATING", "A calcular"
        CALCULATED = "CALCULATED", "Calculada"
        UNDER_REVIEW = "UNDER_REVIEW", "Em revisão"
        APPROVED = "APPROVED", "Aprovada"
        PAID = "PAID", "Paga"
        CLOSED = "CLOSED", "Fechada"
        CANCELLED = "CANCELLED", "Cancelada"

    payroll_period = models.CharField(
        db_column="payroll_period",
        verbose_name="Período (AAAA-MM)",
        max_length=10,
        db_index=True,
        help_text="Formato: 2026-06",
    )
    start_date = models.DateField(
        db_column="start_date",
        verbose_name="Data de início do período",
        db_index=True,
    )
    end_date = models.DateField(
        db_column="end_date",
        verbose_name="Data de fim do período",
        db_index=True,
    )
    approved_by = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="approved_by_id",
        verbose_name="Aprovado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="folhas_run_aprovadas",
    )
    total_gross = MoneyField(
        db_column="total_gross",
        verbose_name="Total bruto",
        default=Decimal("0.00"),
    )
    total_deductions = MoneyField(
        db_column="total_deductions",
        verbose_name="Total de descontos",
        default=Decimal("0.00"),
    )
    total_net = MoneyField(
        db_column="total_net",
        verbose_name="Total líquido",
        default=Decimal("0.00"),
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "recursos_humanos_folha_run"
        verbose_name = "Folha de Pagamento (Período)"
        verbose_name_plural = "Folhas de Pagamento (Períodos)"
        ordering = ["-payroll_period", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "payroll_period"],
                name="uq_payroll_run_period_tenant",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "payroll_period"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def clean(self):
        super().clean()
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError({"end_date": "Data de fim não pode ser anterior à data de início."})
        if self.approved_by_id and self.tenant_id and self.approved_by.tenant_id != self.tenant_id:
            raise ValidationError({"approved_by": "Aprovador deve pertencer ao mesmo tenant."})

    def recalculate_totals(self):
        """Recalcula totais a partir dos PayrollItems."""
        from django.db.models import Sum
        agg = self.itens.filter(deleted=False).aggregate(
            gross=Sum("gross_pay"),
            deductions=Sum("other_deductions"),
            net=Sum("net_pay"),
        )
        self.total_gross = agg.get("gross") or Decimal("0.00")
        self.total_deductions = agg.get("deductions") or Decimal("0.00")
        self.total_net = agg.get("net") or Decimal("0.00")

    def __str__(self) -> str:
        return f"Folha {self.payroll_period} [{self.status}]"


class PayrollItem(NoNameCoreModel):
    """Item individual de um funcionário dentro de uma PayrollRun."""

    prefix = "FPI"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        CALCULATED = "CALCULATED", "Calculado"
        REVIEWED = "REVIEWED", "Revisto"
        APPROVED = "APPROVED", "Aprovado"
        PAID = "PAID", "Pago"
        DISPUTED = "DISPUTED", "Contestado"
        CANCELLED = "CANCELLED", "Cancelado"

    payroll_run = models.ForeignKey(
        PayrollRun,
        db_column="payroll_run_id",
        verbose_name="Folha de pagamento",
        on_delete=models.CASCADE,
        related_name="itens",
        db_index=True,
    )
    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.PROTECT,
        related_name="itens_folha",
        db_index=True,
    )
    base_salary = MoneyField(
        db_column="base_salary",
        verbose_name="Salário base",
        default=Decimal("0.00"),
    )
    overtime_amount = MoneyField(
        db_column="overtime_amount",
        verbose_name="Horas extras",
        default=Decimal("0.00"),
    )
    allowances = MoneyField(
        db_column="allowances",
        verbose_name="Subsídios",
        default=Decimal("0.00"),
    )
    bonuses = MoneyField(
        db_column="bonuses",
        verbose_name="Bónus",
        default=Decimal("0.00"),
    )
    absence_deductions = MoneyField(
        db_column="absence_deductions",
        verbose_name="Descontos por faltas",
        default=Decimal("0.00"),
    )
    other_deductions = MoneyField(
        db_column="other_deductions",
        verbose_name="Outros descontos",
        default=Decimal("0.00"),
    )
    gross_pay = MoneyField(
        db_column="gross_pay",
        verbose_name="Salário bruto",
        default=Decimal("0.00"),
    )
    net_pay = MoneyField(
        db_column="net_pay",
        verbose_name="Salário líquido",
        default=Decimal("0.00"),
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "recursos_humanos_folha_item"
        verbose_name = "Item de Folha de Pagamento"
        verbose_name_plural = "Itens de Folha de Pagamento"
        ordering = ["payroll_run", "employee"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "payroll_run", "employee"],
                name="uq_payroll_item_run_employee",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "payroll_run", "status"]),
            models.Index(fields=["tenant", "employee"]),
        ]

    def clean(self):
        super().clean()
        if self.payroll_run_id and self.tenant_id and self.payroll_run.tenant_id != self.tenant_id:
            raise ValidationError({"payroll_run": "Folha e item devem pertencer ao mesmo tenant."})
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e item de folha devem pertencer ao mesmo tenant."})

    def recalculate(self):
        """Calcula gross_pay e net_pay a partir dos componentes."""
        gross = (
            Decimal(self.base_salary or 0)
            + Decimal(self.overtime_amount or 0)
            + Decimal(self.allowances or 0)
            + Decimal(self.bonuses or 0)
        ).quantize(Decimal("0.01"))
        deductions = (
            Decimal(self.absence_deductions or 0)
            + Decimal(self.other_deductions or 0)
        ).quantize(Decimal("0.01"))
        self.gross_pay = gross
        self.net_pay = max(gross - deductions, Decimal("0.00"))

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.payroll_run_id:
            self.tenant_id = self.payroll_run.tenant_id
        self.recalculate()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        employee_name = ""
        try:
            employee_name = str(self.employee)
        except Exception:
            pass
        period = ""
        try:
            period = self.payroll_run.payroll_period
        except Exception:
            pass
        return f"{employee_name} — {period}".strip(" —")
