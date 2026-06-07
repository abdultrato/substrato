from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import CoreModel


class FamilyDependent(CoreModel):
    """Membro do agregado familiar do funcionário."""

    prefix = "AGF"

    class Parentesco(models.TextChoices):
        CONJUGE = "CONJUGE", "Cônjuge"
        FILHO = "FILHO", "Filho(a)"
        PAI = "PAI", "Pai/Mãe"
        IRMAO = "IRMAO", "Irmão(ã)"
        OUTRO = "OUTRO", "Outro"

    class Gender(models.TextChoices):
        MALE = "M", "Masculino"
        FEMALE = "F", "Feminino"
        OTHER = "OUTRO", "Outro"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="agregados_familiares",
        db_index=True,
    )
    relationship = models.CharField(
        db_column="relationship",
        verbose_name="Grau de Parentesco",
        max_length=20,
        choices=Parentesco.choices,
        default=Parentesco.OUTRO,
        db_index=True,
    )
    gender = models.CharField(
        db_column="gender",
        verbose_name="Género",
        max_length=10,
        choices=Gender.choices,
        blank=True,
        default="",
    )
    birth_date = models.DateField(
        db_column="birth_date",
        verbose_name="Data de nascimento",
        null=True,
        blank=True,
    )
    document_number = models.CharField(
        db_column="document_number",
        verbose_name="Número do documento",
        max_length=60,
        blank=True,
        default="",
    )
    phone = models.CharField(
        db_column="phone",
        verbose_name="Telefone",
        max_length=30,
        blank=True,
        default="",
    )
    lives_with_employee = models.BooleanField(
        db_column="lives_with_employee",
        verbose_name="Vive com o funcionário",
        default=True,
        db_index=True,
    )
    is_dependent = models.BooleanField(
        db_column="is_dependent",
        verbose_name="É dependente",
        default=True,
        db_index=True,
    )
    is_emergency_contact = models.BooleanField(
        db_column="is_emergency_contact",
        verbose_name="É contacto de emergência",
        default=False,
        db_index=True,
    )
    benefit_eligible = models.BooleanField(
        db_column="benefit_eligible",
        verbose_name="Elegível para benefícios",
        default=True,
        db_index=True,
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "recursos_humanos_agregadofamiliar"
        verbose_name = "Agregado Familiar"
        verbose_name_plural = "Agregados Familiares"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "employee"]),
            models.Index(fields=["tenant", "relationship"]),
            models.Index(fields=["tenant", "is_emergency_contact"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e agregado familiar devem pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.name} ({self.relationship})".strip()
