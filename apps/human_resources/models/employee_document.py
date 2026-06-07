from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import CoreModel


class EmployeeDocument(CoreModel):
    """Documento laboral associado ao funcionário."""

    prefix = "DOC"

    class DocumentType(models.TextChoices):
        BI = "BI", "Bilhete de Identidade"
        PASSPORT = "PASSAPORTE", "Passaporte"
        NUIT = "NUIT", "NUIT / NIF"
        INSS = "INSS", "Cartão INSS"
        CONTRACT = "CONTRATO", "Contrato de trabalho"
        MEDICAL_CERTIFICATE = "ATESTADO", "Atestado médico"
        CURRICULUM = "CURRICULO", "Currículo"
        CERTIFICATE = "CERTIFICADO", "Certificado / Diploma"
        PAYSLIP = "RECIBO", "Recibo de salário"
        DISCIPLINARY = "DISCIPLINAR", "Documento disciplinar"
        OTHER = "OUTRO", "Outro"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativo"
        EXPIRED = "EXPIRED", "Expirado"
        CANCELLED = "CANCELLED", "Cancelado"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="documentos",
        db_index=True,
    )
    document_type = models.CharField(
        db_column="document_type",
        verbose_name="Tipo de documento",
        max_length=20,
        choices=DocumentType.choices,
        default=DocumentType.OTHER,
        db_index=True,
    )
    title = models.CharField(
        db_column="title",
        verbose_name="Título",
        max_length=180,
    )
    file = models.FileField(
        db_column="file",
        verbose_name="Ficheiro",
        upload_to="hr/documents/",
        null=True,
        blank=True,
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
        db_table = "recursos_humanos_documento"
        verbose_name = "Documento do Funcionário"
        verbose_name_plural = "Documentos dos Funcionários"
        ordering = ["employee", "document_type", "title"]
        indexes = [
            models.Index(fields=["tenant", "employee", "document_type"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e documento devem pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)
