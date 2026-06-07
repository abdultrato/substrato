from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField


class Contract(NoNameCoreModel):
    """Contrato de trabalho vinculado ao funcionário."""

    prefix = "CNT"

    class ContractType(models.TextChoices):
        INDEFINITE = "INDEFINIDO", "Contrato por tempo indeterminado"
        FIXED_TERM = "TERMO_CERTO", "Contrato a termo certo"
        UNCERTAIN_TERM = "TERMO_INCERTO", "Contrato a termo incerto"
        INTERNSHIP = "ESTAGIO", "Estágio"
        SERVICE = "PRESTACAO_SERVICOS", "Prestação de serviços"
        OTHER = "OUTRO", "Outro"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativo"
        EXPIRED = "EXPIRED", "Expirado"
        TERMINATED = "TERMINATED", "Rescindido"
        CANCELLED = "CANCELLED", "Cancelado"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="contratos",
        db_index=True,
    )
    contract_type = models.CharField(
        db_column="contract_type",
        verbose_name="Tipo de contrato",
        max_length=24,
        choices=ContractType.choices,
        default=ContractType.INDEFINITE,
        db_index=True,
    )
    start_date = models.DateField(
        db_column="start_date",
        verbose_name="Data de início",
        default=timezone.now,
        db_index=True,
    )
    end_date = models.DateField(
        db_column="end_date",
        verbose_name="Data de fim",
        null=True,
        blank=True,
        db_index=True,
    )
    salary = MoneyField(
        db_column="salary",
        verbose_name="Salário contratual",
        default=Decimal("0.00"),
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=12,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )

    class Meta:
        db_table = "recursos_humanos_contrato"
        verbose_name = "Contrato de Trabalho"
        verbose_name_plural = "Contratos de Trabalho"
        ordering = ["-start_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "employee", "status"]),
            models.Index(fields=["tenant", "contract_type"]),
            models.Index(fields=["tenant", "end_date"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e contrato devem pertencer ao mesmo tenant."})
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError({"end_date": "Data de fim não pode ser anterior à data de início."})
        if self.salary is not None and self.salary < Decimal("0.00"):
            raise ValidationError({"salary": "Salário contratual inválido."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)
