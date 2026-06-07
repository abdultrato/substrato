from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class VacationBalance(NoNameCoreModel):
    """Saldo anual de férias por funcionário."""

    prefix = "SFE"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="saldos_ferias",
        db_index=True,
    )
    year = models.PositiveSmallIntegerField(
        db_column="year",
        verbose_name="Ano",
        db_index=True,
    )
    entitled_days = models.PositiveSmallIntegerField(
        db_column="entitled_days",
        verbose_name="Dias com direito",
        default=22,
    )
    used_days = models.PositiveSmallIntegerField(
        db_column="used_days",
        verbose_name="Dias utilizados",
        default=0,
    )
    pending_days = models.PositiveSmallIntegerField(
        db_column="pending_days",
        verbose_name="Dias pendentes (aprovação)",
        default=0,
    )
    remaining_days = models.PositiveSmallIntegerField(
        db_column="remaining_days",
        verbose_name="Dias restantes",
        default=0,
    )
    carried_over_days = models.PositiveSmallIntegerField(
        db_column="carried_over_days",
        verbose_name="Dias transitados do ano anterior",
        default=0,
    )

    class Meta:
        db_table = "recursos_humanos_saldo_ferias"
        verbose_name = "Saldo de Férias"
        verbose_name_plural = "Saldos de Férias"
        ordering = ["-year", "employee"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "employee", "year"],
                name="uq_vacation_balance_employee_year",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "employee", "year"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e saldo de férias devem pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        # Recalcular remaining_days automaticamente
        total = int(self.entitled_days or 0) + int(self.carried_over_days or 0)
        used = int(self.used_days or 0) + int(self.pending_days or 0)
        self.remaining_days = max(total - used, 0)
        self.full_clean()
        return super().save(*args, **kwargs)
