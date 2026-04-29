"""Tipos de amostras biológicas usadas em exames laboratoriais."""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from core.models.base import CoreModel


class Sample(CoreModel):
    """Cadastro de amostras com requisitos de coleta e conservação."""

    prefix = "AMO"

    class BottleType(models.TextChoices):
        DRY_TUBE = "TUBO_SECO", "Tubo seco (soro)"
        EDTA_TUBE = "TUBO_EDTA", "Tubo EDTA"
        CITRATE_TUBE = "TUBO_CITRATO", "Tubo citrato"
        FLUORIDE_TUBE = "TUBO_FLUORETO", "Tubo fluoreto"
        URINE_CONTAINER = "FRASCO_URINA", "Frasco de urina"
        STOOL_CONTAINER = "FRASCO_FEZES", "Frasco de fezes"
        STERILE_CONTAINER = "FRASCO_ESTERIL", "Frasco estéril"
        BLOOD_CULTURE_BOTTLE = "HEMOCULTURA", "Frasco de hemocultura"
        OTHER = "OUTRO", "Outro"

    bottle_type = models.CharField(
        db_column="bottle_type",
        max_length=30,
        choices=BottleType.choices,
        default=BottleType.DRY_TUBE,
        db_index=True,
        verbose_name="Tipo de frasco",
    )
    cap_color = models.CharField(
        db_column="cap_color",
        max_length=80,
        blank=True,
        default="",
        verbose_name="Cor da tampa",
        help_text="Ex.: roxa, vermelha, azul, amarela.",
    )
    minimum_volume_ml = models.DecimalField(
        db_column="minimum_volume_ml",
        max_digits=7,
        decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Volume mínimo (ml)",
    )
    fasting_required = models.BooleanField(
        db_column="fasting_required",
        default=False,
        db_index=True,
        verbose_name="Requer jejum",
    )
    fasting_hours = models.PositiveIntegerField(
        db_column="fasting_hours",
        default=0,
        verbose_name="Horas de jejum",
    )
    storage_temperature = models.CharField(
        db_column="storage_temperature",
        max_length=120,
        blank=True,
        default="2-8°C",
        verbose_name="Conservação",
        help_text="Ex.: ambiente, refrigerado (2-8°C), congelado (-20°C).",
    )
    stability_hours = models.PositiveIntegerField(
        db_column="stability_hours",
        default=24,
        verbose_name="Estabilidade (horas)",
    )
    anticoagulant = models.CharField(
        db_column="anticoagulant",
        max_length=120,
        blank=True,
        default="",
        verbose_name="Anticoagulante/reagente",
    )
    collection_instructions = models.TextField(
        db_column="collection_instructions",
        blank=True,
        default="",
        verbose_name="Instruções de coleta",
    )

    class Meta:
        db_table = "clinico_amostra"
        ordering = ["name", "created_at"]
        verbose_name = "Amostra"
        verbose_name_plural = "Amostras"
        indexes = [
            models.Index(fields=["tenant", "name"]),
            models.Index(fields=["bottle_type"]),
            models.Index(fields=["fasting_required"]),
        ]

    def clean(self):
        super().clean()
        errors = {}

        if not self.name:
            errors["name"] = "A amostra deve possuir um nome."

        if self.fasting_required and (self.fasting_hours or 0) <= 0:
            errors["fasting_hours"] = "Informe as horas de jejum quando a amostra requer jejum."

        if not self.fasting_required and (self.fasting_hours or 0) != 0:
            errors["fasting_hours"] = "Horas de jejum devem ser zero quando jejum não é obrigatório."

        if (self.minimum_volume_ml or Decimal("0.00")) <= Decimal("0.00"):
            errors["minimum_volume_ml"] = "Volume mínimo deve ser maior que zero."

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return self.name


Amostra = Sample
