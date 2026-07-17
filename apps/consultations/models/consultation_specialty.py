"""Especialidade de consulta com preço base e IVA."""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models.base import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class ConsultationSector(models.TextChoices):
    GENERAL_MEDICINE = "GENERAL_MEDICINE", "Clínica Geral"
    CARDIOLOGY = "CARDIOLOGY", "Cardiologia"
    DERMATOLOGY = "DERMATOLOGY", "Dermatologia"
    ENDOCRINOLOGY = "ENDOCRINOLOGY", "Endocrinologia"
    ANESTHESIOLOGY = "ANESTHESIOLOGY", "Anestesiologia"
    PATHOLOGY = "PATHOLOGY", "Patologia"
    NEUROLOGY = "NEUROLOGY", "Neurologia"
    NUTRITION = "NUTRITION", "Nutrição"
    OPHTHALMOLOGY = "OPHTHALMOLOGY", "Oftalmologia"
    DENTISTRY = "DENTISTRY", "Odontologia"
    PHYSIOTHERAPY = "PHYSIOTHERAPY", "Fisioterapia"
    OCCUPATIONAL_THERAPY = "OCCUPATIONAL_THERAPY", "Terapia Ocupacional"
    GYNECOLOGY = "GYNECOLOGY", "Ginecologia"
    OBSTETRICS = "OBSTETRICS", "Obstetrícia"
    NEPHROLOGY = "NEPHROLOGY", "Nefrologia"
    HEMATOLOGY = "HEMATOLOGY", "Hematologia"
    GASTROENTEROLOGY = "GASTROENTEROLOGY", "Gastroenterologia"
    OTHER = "OTHER", "Outro"


SPECIALTY_NAME_TO_SECTOR = {
    "clinica geral": ConsultationSector.GENERAL_MEDICINE,
    "medicina geral": ConsultationSector.GENERAL_MEDICINE,
    "medicina interna": ConsultationSector.GENERAL_MEDICINE,
    "cardiologia": ConsultationSector.CARDIOLOGY,
    "dermatologia": ConsultationSector.DERMATOLOGY,
    "endocrinologia": ConsultationSector.ENDOCRINOLOGY,
    "anestesiologia": ConsultationSector.ANESTHESIOLOGY,
    "aanestesiologia": ConsultationSector.ANESTHESIOLOGY,
    "patologia": ConsultationSector.PATHOLOGY,
    "neurologia": ConsultationSector.NEUROLOGY,
    "nutricao": ConsultationSector.NUTRITION,
    "nutricao clinica": ConsultationSector.NUTRITION,
    "oftalmologia": ConsultationSector.OPHTHALMOLOGY,
    "odontologia": ConsultationSector.DENTISTRY,
    "dentaria": ConsultationSector.DENTISTRY,
    "fisioterapia": ConsultationSector.PHYSIOTHERAPY,
    "terapia ocupacional": ConsultationSector.OCCUPATIONAL_THERAPY,
    "ginecologia": ConsultationSector.GYNECOLOGY,
    "ginecologia obstetricia": ConsultationSector.GYNECOLOGY,
    "obstetricia": ConsultationSector.OBSTETRICS,
    "nefrologia": ConsultationSector.NEPHROLOGY,
    "nefrplogia": ConsultationSector.NEPHROLOGY,
    "hematologia": ConsultationSector.HEMATOLOGY,
    "gastroenterologia": ConsultationSector.GASTROENTEROLOGY,
    "gstroenterologia": ConsultationSector.GASTROENTEROLOGY,
}


def normalize_specialty_name(value: str) -> str:
    import unicodedata

    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_text = "".join(char for char in normalized if not unicodedata.combining(char))
    return " ".join(ascii_text.lower().replace("-", " ").split())


def infer_consultation_sector(name: str) -> str:
    normalized = normalize_specialty_name(name)
    return SPECIALTY_NAME_TO_SECTOR.get(normalized, ConsultationSector.OTHER)


class ConsultationSpecialty(CoreModel):
    """
    Especialidade / tipo de consulta com preço base.

    O frontend usa esta tabela como "choices" na marcação.
    """

    prefix = "ESP"  # Prefixo para IDs amigáveis

    description = models.TextField(

        db_column="description",

        verbose_name="Descrição", blank=True, default="")

    base_price = MoneyField(

        db_column="base_price",

        verbose_name="Preço base", default=Decimal("0.00"))

    sector = models.CharField(
        db_column="sector",
        max_length=32,
        choices=ConsultationSector.choices,
        default=ConsultationSector.OTHER,
        db_index=True,
        verbose_name="Sector clínico",
        help_text="Sector operacional onde consultas desta especialidade devem aparecer.",
    )

    vat_percentage = models.DecimalField(

        db_column="vat_percentage",

        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("16.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Taxa de IVA aplicada ao serviço de consulta (0 a 100).",
    )

    active = models.BooleanField(

        db_column="active",

        verbose_name="Ativo", default=True, db_index=True)

    class Meta:
        db_table = "consultas_especialidadeconsulta"
        verbose_name = "Especialidade (Consulta)"
        verbose_name_plural = "Especialidades (Consulta)"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "active", "name"]),
            models.Index(fields=["tenant", "sector", "active"]),
        ]

    def clean(self):
        super().clean()

        if not (self.name or "").strip():
            raise ValidationError({"name": "Informe o name da specialty."})

        if self.base_price is None or self.base_price < Decimal("0.00"):
            raise ValidationError({"base_price": "Preço base inválido."})

        if not self.sector:
            self.sector = infer_consultation_sector(self.name)

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.sector:
            self.sector = infer_consultation_sector(self.name)
        super().save(*args, **kwargs)

    def activate(self):
        """Reativa a especialidade para novos agendamentos (§19.5)."""
        self.active = True
        self.save(update_fields=["active", "updated_at"])
        return self

    def deactivate(self):
        """Inativa a especialidade — deixa de ser oferecida em novas consultas."""
        self.active = False
        self.save(update_fields=["active", "updated_at"])
        return self
