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
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="folhas_payment",
        db_index=True,
    )

    year = models.PositiveSmallIntegerField(  # Ano de referência
        db_column="year",
        verbose_name="Ano",
        db_index=True,
    )
    month = models.PositiveSmallIntegerField(  # Mês (1-12)
        db_column="month",
        verbose_name="Mês",
        db_index=True,
    )

    nominal_salary = MoneyField(  # Salário base do mês
        db_column="nominal_salary",
        verbose_name="Salário Nominal",
        default=Decimal("0.00"),
    )
    base_month_hours = models.PositiveSmallIntegerField(  # Horas contratuais
        db_column="base_month_hours",
        verbose_name="Horas Base do Mês",
        default=176,
    )
    overtime_hour_multiplier = models.DecimalField(  # Multiplicador da hora extra
        db_column="overtime_hour_multiplier",
        verbose_name="Multiplicador da Hora Extra",
        max_digits=4,
        decimal_places=2,
        default=Decimal("1.50"),
        help_text="Usado como fallback quando o valor extraordinário não estiver definido no funcionário.",
    )
    salary_increase_value = MoneyField(
        db_column="salary_increase_value",
        verbose_name="Aumento Salarial no Mês",
        default=Decimal("0.00"),
    )
    tenure_increase_value = MoneyField(
        db_column="tenure_increase_value",
        verbose_name="Aumento por tempo de serviço",
        default=Decimal("0.00"),
    )
    family_dependents_count = models.PositiveSmallIntegerField(
        db_column="family_dependents_count",
        verbose_name="Quantidade de agregados familiares",
        default=0,
    )
    family_allowance_value = MoneyField(
        db_column="family_allowance_value",
        verbose_name="Aumento por agregados familiares",
        default=Decimal("0.00"),
    )
    absence_days = models.PositiveSmallIntegerField(
        db_column="absence_days",
        verbose_name="Faltas no mês",
        default=0,
    )
    discounted_absence_days = models.PositiveSmallIntegerField(
        db_column="discounted_absence_days",
        verbose_name="Faltas com desconto",
        default=0,
    )
    daily_salary_value = models.DecimalField(
        db_column="daily_salary_value",
        verbose_name="Valor diário do salário",
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
    )
    absence_discount_value = MoneyField(
        db_column="absence_discount_value",
        verbose_name="Desconto por faltas",
        default=Decimal("0.00"),
    )
    other_discounts_value = MoneyField(
        db_column="other_discounts_value",
        verbose_name="Outros descontos",
        default=Decimal("0.00"),
    )
    disciplinary_discount_value = MoneyField(
        db_column="disciplinary_discount_value",
        verbose_name="Desconto disciplinar",
        default=Decimal("0.00"),
    )
    ordinary_hours = models.DecimalField(
        db_column="ordinary_hours",
        verbose_name="Horas ordinárias",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    extraordinary_hours = models.DecimalField(
        db_column="extraordinary_hours",
        verbose_name="Horas extraordinárias",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    ordinary_hour_value = models.DecimalField(
        db_column="ordinary_hour_value",
        verbose_name="Valor hora ordinária",
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
    )
    extraordinary_hour_value = models.DecimalField(
        db_column="extraordinary_hour_value",
        verbose_name="Valor hora extraordinária",
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
    )
    ordinary_hours_value = MoneyField(
        db_column="ordinary_hours_value",
        verbose_name="Total horas ordinárias",
        default=Decimal("0.00"),
    )
    extraordinary_hours_value = MoneyField(
        db_column="extraordinary_hours_value",
        verbose_name="Total horas extraordinárias",
        default=Decimal("0.00"),
    )
    gross_salary = MoneyField(
        db_column="gross_salary",
        verbose_name="Salário bruto",
        default=Decimal("0.00"),
    )

    calculated_overtime_hours = models.DecimalField(  # Horas extras computadas no mês
        db_column="calculated_overtime_hours",
        verbose_name="Horas Extras Calculadas",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    hourly_value = models.DecimalField(  # Valor hora efetivo
        db_column="hourly_value",
        verbose_name="Valor da Hora",
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
    )
    overtime_value = MoneyField(  # Valor total de horas extras
        db_column="overtime_value",
        verbose_name="Valor das Horas Extras",
        default=Decimal("0.00"),
    )
    total_salary = MoneyField(  # Salário total (nominal + extras)
        db_column="total_salary",
        verbose_name="Salário Total",
        default=Decimal("0.00"),
    )

    closed = models.BooleanField(  # Travamento da folha
        db_column="closed",
        verbose_name="Fechada",
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

        non_negative_money_fields = [
            "salary_increase_value",
            "tenure_increase_value",
            "family_allowance_value",
            "absence_discount_value",
            "other_discounts_value",
            "disciplinary_discount_value",
            "ordinary_hours_value",
            "extraordinary_hours_value",
            "gross_salary",
            "overtime_value",
            "total_salary",
        ]
        for field in non_negative_money_fields:
            value = getattr(self, field, None)
            if value is not None and value < Decimal("0.00"):
                raise ValidationError({field: "Valor inválido."})

        if self.ordinary_hours < Decimal("0.00") or self.extraordinary_hours < Decimal("0.00"):
            raise ValidationError({"ordinary_hours": "Horas não podem ser negativas."})

        if self.ordinary_hour_value < Decimal("0.0000") or self.extraordinary_hour_value < Decimal("0.0000"):
            raise ValidationError({"ordinary_hour_value": "Valor hora não pode ser negativo."})

        if self.absence_days < 0 or self.discounted_absence_days < 0:
            raise ValidationError({"absence_days": "Quantidade de faltas inválida."})

    def _calculate_overtime_hours(self) -> tuple[Decimal, Decimal]:
        from .overtime import Overtime

        qs = (
            Overtime.objects.filter(
                tenant=self.tenant,
                employee=self.employee,
                date__year=self.year,
                date__month=self.month,
                deleted=False,
            )
            .values("kind")
            .annotate(total=Sum("hours"))
        )
        ordinary = Decimal("0.00")
        extraordinary = Decimal("0.00")
        for row in qs:
            hours = Decimal(row.get("total") or Decimal("0.00"))
            kind = row.get("kind") or Overtime.Kind.EXTRAORDINARY
            if kind == Overtime.Kind.ORDINARY:
                ordinary += hours
            else:
                extraordinary += hours
        return ordinary, extraordinary

    def _calculate_total_overtime_hours(self) -> Decimal:
        ordinary, extraordinary = self._calculate_overtime_hours()
        return (ordinary + extraordinary).quantize(Decimal("0.01"))

    def _calculate_absences(self) -> tuple[int, int]:
        from .absence import Absence

        qs = Absence.objects.filter(
            tenant=self.tenant,
            employee=self.employee,
            date__year=self.year,
            date__month=self.month,
            deleted=False,
        )
        total_absence_days = qs.count()
        # Regra de negócio: cada dia de ausência no mês entra no desconto da folha.
        return int(total_absence_days), int(total_absence_days)

    def _resolve_ordinary_hour_value(self) -> Decimal:
        if self.ordinary_hour_value and self.ordinary_hour_value > Decimal("0.0000"):
            return Decimal(self.ordinary_hour_value)
        if self.base_month_hours and self.nominal_salary is not None:
            return (Decimal(self.nominal_salary) / Decimal(self.base_month_hours)).quantize(Decimal("0.0000"))
        return Decimal("0.0000")

    def _resolve_extraordinary_hour_value(self, ordinary_hour_value: Decimal) -> Decimal:
        if self.extraordinary_hour_value and self.extraordinary_hour_value > Decimal("0.0000"):
            return Decimal(self.extraordinary_hour_value)
        return (Decimal(ordinary_hour_value) * Decimal(self.overtime_hour_multiplier or Decimal("1.00"))).quantize(
            Decimal("0.0000")
        )

    def recalculate(self):
        # Synchronize salary and inherited base values from employee/profession.
        if self.employee_id:
            if self.nominal_salary is None or self.nominal_salary <= Decimal("0.00"):
                self.nominal_salary = self.employee.nominal_salary
            if not self.base_month_hours:
                self.base_month_hours = self.employee.base_month_hours or 176

            self.salary_increase_value = Decimal(self.employee.salary_increase or Decimal("0.00"))
            progression_window = int(self.employee.minimum_progression_months or 0) or 12
            tenure_cycles = int(self.employee.tenure_months // progression_window)
            self.tenure_increase_value = (
                Decimal(tenure_cycles) * Decimal(self.employee.salary_increase or Decimal("0.00"))
            ).quantize(Decimal("0.01"))

            if Decimal(self.ordinary_hour_value or Decimal("0.0000")) <= Decimal("0.0000"):
                self.ordinary_hour_value = Decimal(self.employee.ordinary_hour_value or Decimal("0.0000"))
            if Decimal(self.extraordinary_hour_value or Decimal("0.0000")) <= Decimal("0.0000"):
                self.extraordinary_hour_value = Decimal(self.employee.extraordinary_hour_value or Decimal("0.0000"))

            self.family_dependents_count = self.employee.agregados_familiares.filter(deleted=False).count()
            self.family_allowance_value = (
                Decimal(self.family_dependents_count)
                * Decimal(self.employee.family_allowance_per_dependent or Decimal("0.00"))
            ).quantize(Decimal("0.01"))

        ordinary_hours = Decimal("0.00")
        extraordinary_hours = Decimal("0.00")
        absence_days = 0
        discounted_absence_days = 0
        if self.employee_id and self.tenant_id:
            ordinary_hours, extraordinary_hours = self._calculate_overtime_hours()
            absence_days, discounted_absence_days = self._calculate_absences()

        self.ordinary_hours = ordinary_hours.quantize(Decimal("0.01"))
        self.extraordinary_hours = extraordinary_hours.quantize(Decimal("0.01"))
        self.calculated_overtime_hours = (ordinary_hours + extraordinary_hours).quantize(Decimal("0.01"))
        self.absence_days = absence_days
        self.discounted_absence_days = discounted_absence_days

        ordinary_hour_value = self._resolve_ordinary_hour_value()
        extraordinary_hour_value = self._resolve_extraordinary_hour_value(ordinary_hour_value)
        self.ordinary_hour_value = ordinary_hour_value
        self.extraordinary_hour_value = extraordinary_hour_value
        self.hourly_value = ordinary_hour_value

        ordinary_hours_value = (ordinary_hours * ordinary_hour_value).quantize(Decimal("0.01"))
        extraordinary_hours_value = (extraordinary_hours * extraordinary_hour_value).quantize(Decimal("0.01"))
        overtime_total_value = (ordinary_hours_value + extraordinary_hours_value).quantize(Decimal("0.01"))

        self.ordinary_hours_value = ordinary_hours_value
        self.extraordinary_hours_value = extraordinary_hours_value
        self.overtime_value = overtime_total_value

        daily_salary_value = Decimal("0.0000")
        if self.nominal_salary is not None:
            daily_salary_value = (Decimal(self.nominal_salary) / Decimal("22")).quantize(Decimal("0.0000"))
        self.daily_salary_value = daily_salary_value
        self.absence_discount_value = (daily_salary_value * Decimal(self.discounted_absence_days)).quantize(
            Decimal("0.01")
        )

        gross_salary = (
            Decimal(self.nominal_salary or Decimal("0.00"))
            + Decimal(self.salary_increase_value or Decimal("0.00"))
            + Decimal(self.tenure_increase_value or Decimal("0.00"))
            + Decimal(self.family_allowance_value or Decimal("0.00"))
            + Decimal(overtime_total_value or Decimal("0.00"))
        ).quantize(Decimal("0.01"))
        self.gross_salary = gross_salary

        total_discounts = (
            Decimal(self.absence_discount_value or Decimal("0.00"))
            + Decimal(self.other_discounts_value or Decimal("0.00"))
            + Decimal(self.disciplinary_discount_value or Decimal("0.00"))
        ).quantize(Decimal("0.01"))

        total = (gross_salary - total_discounts).quantize(Decimal("0.01"))
        self.total_salary = total if total >= Decimal("0.00") else Decimal("0.00")

    @property
    def salary_base(self) -> Decimal:
        return Decimal(self.nominal_salary or Decimal("0.00")).quantize(Decimal("0.01"))

    @property
    def salary_liquido(self) -> Decimal:
        return Decimal(self.total_salary or Decimal("0.00")).quantize(Decimal("0.01"))

    def __str__(self) -> str:
        code = str(self.custom_id or "").strip()
        if not code and self.pk:
            code = f"#{self.pk}"

        employee_name = ""
        if self.employee_id:
            try:
                employee_name = str(self.employee).strip()
            except Exception:
                employee_name = ""

        period = ""
        if self.month and self.year:
            period = f"{int(self.month):02d}/{int(self.year)}"

        parts = ["Folha de Pagamento", code, employee_name, period]
        return " - ".join(part for part in parts if part)

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        # Always recalculate to keep the aggregate consistent.
        self.recalculate()
        self.full_clean()
        return super().save(*args, **kwargs)


Payroll._apuracao_hours_extras = Payroll._calculate_total_overtime_hours
Payroll.recalcular = Payroll.recalculate
