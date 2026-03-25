from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class Termination(NoNameCoreModel):
    """
    Dispensa/desligamento de funcionário (MVP).
    """

    prefix = "DSP"

    class Type(models.TextChoices):
        DEMISSAO = "DEMISSAO", "Demissão"
        RESCISAO = "RESCISAO", "Rescisão"
        FIM_CONTRATO = "FIM_CONTRATO", "Fim de contrato"
        OUTRO = "OUTRO", "Outro"

    Tipo = Type

    employee = models.ForeignKey(

        "recursos_humanos.Employee",

        db_column="funcionario_id",
        on_delete=models.CASCADE,
        related_name="dispensas",
        db_index=True,
    )

    date = models.DateField(

        db_column="data",

        default=timezone.now, db_index=True)
    type = models.CharField(
        db_column="tipo",
        max_length=20, choices=Type.choices, default=Type.DEMISSAO, db_index=True)
    reason = models.TextField(
        db_column="motivo",
        blank=True, default="")

    class Meta:
        db_table = "recursos_humanos_dispensa"
        verbose_name = "Dispensa"
        verbose_name_plural = "Dispensas"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "employee", "date"]),
            models.Index(fields=["tenant", "type", "date"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e dispensa devem pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)
