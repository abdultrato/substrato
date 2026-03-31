from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum

from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField


class Payroll(NoNameCoreModel):
    """
    Monthly payroll per employee (MVP).
    """

    prefix = "FPG"  # Prefixo custom_id

    employee = models.ForeignKey(  # Funcionário alvo da folha
        "recursos_humanos.Employee",
        db_column="employee_id",
        on_delete=models.CASCADE,
        related_name="folhas_payment",
        db_index=True,
    )

    year = models.PositiveSmallIntegerField(  # Ano de referência
        db_column="year",
        db_index=True,
    )
    month = models.PositiveSmallIntegerField(  # Mês (1-12)
        db_column="month",
        db_index=True,
    )

    nominal_salary = MoneyField(  # Salário base do mês
        db_column="nominal_salary",
        default=Decimal("0.00"),
    )
    base_month_hours = models.PositiveSmallIntegerField(  # Horas contratuais
        db_column="base_month_hours",
        default=176,
    )
    overtime_hour_multiplier = models.DecimalField(  # Multiplicador da hora extra
        db_column="overtime_hour_multiplier",
        max_digits=4,
        decimal_places=2,
        default=Decimal("1.50"),
    )

    calculated_overtime_hours = models.DecimalField(  # Horas extras computadas no mês
        db_column="calculated_overtime_hours",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    hourly_value = models.DecimalField(  # Valor hora efetivo
        db_column="hourly_value",
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
    )
    overtime_value = MoneyField(  # Valor total de horas extras
        db_column="overtime_value",
        default=Decimal("0.00"),
    )
    total_salary = MoneyField(  # Salário total (nominal + extras)
        db_column="total_salary",
        default=Decimal("0.00"),
    )

    closed = models.BooleanField(  # Travamento da folha
        db_column="closed",
        default=False,
        db_index=True,
    )

    class Meta:
        db_table = "recursos_humanos_folhapagamento"  # Nome legado
        verbose_name = "Folha de Pagamento"
        verbose_name_plural = "Folhas de Pagamento"
        ordering = ["-year", "-month", "-created_at"]  # Listagem do mais recente
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "employee", "year", "month"],
                name="uniq_folha_por_employee_month",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "year", "month"]),
            models.Index(fields=["tenant", "employee", "year", "month"]),
        ]

    def clean(self):
        super().clean()

        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e folha devem pertencer ao mesmo tenant."})

        if not (1 <= int(self.month or 0) <= 12):
            raise ValidationError({"month": "Mês inválido (1-12)."})

        if self.nominal_salary is not None and self.nominal_salary < Decimal("0.00"):
            raise ValidationError({"nominal_salary": "Salário nominal inválido."})

        if self.base_month_hours <= 0:
            raise ValidationError({"base_month_hours": "Horas base do mês deve ser > 0."})

        if self.overtime_hour_multiplier <= Decimal("0.00"):
            raise ValidationError({"overtime_hour_multiplier": "Multiplicador de hora extra inválido."})

    def _calculate_overtime_hours(self) -> Decimal:
        from .overtime import Overtime

        qs = Overtime.objects.filter(
            tenant=self.tenant,
            employee=self.employee,
            date__year=self.year,
            date__month=self.month,
            deleted=False,
        )
        raw = qs.aggregate(total=Sum("hours")).get("total") or Decimal("0.00")
        return Decimal(raw)

    def recalculate(self):
        # If not provided, synchronize salary/base hours from the employee.
        if self.employee_id:
            if self.nominal_salary is None:
                # Includes promotions and salary increases in the effective salary.
                current_salary = getattr(self.employee, "current_salary", None)
                self.nominal_salary = (
                    current_salary if current_salary is not None else self.employee.nominal_salary
                )
            if not self.base_month_hours:
                self.base_month_hours = self.employee.base_month_hours or 176

        hours_extras = self._calculate_overtime_hours() if self.employee_id and self.tenant_id else Decimal("0.00")
        self.calculated_overtime_hours = hours_extras

        hourly_value = Decimal("0.0000")
        if self.base_month_hours and self.nominal_salary is not None:
            hourly_value = (Decimal(self.nominal_salary) / Decimal(self.base_month_hours)).quantize(Decimal("0.0000"))
        self.hourly_value = hourly_value

        value_extra = (hours_extras * hourly_value * Decimal(self.overtime_hour_multiplier)).quantize(Decimal("0.01"))
        self.overtime_value = value_extra

        total = (Decimal(self.nominal_salary) + value_extra).quantize(Decimal("0.01"))
        self.total_salary = total

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        # Always recalculate to keep the aggregate consistent.
        self.recalculate()
        self.full_clean()
        return super().save(*args, **kwargs)


Payroll._apuracao_hours_extras = Payroll._calculate_overtime_hours
Payroll.recalcular = Payroll.recalculate
