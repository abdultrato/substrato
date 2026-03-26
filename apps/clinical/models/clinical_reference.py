from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import (
    F,
    Q,
)

from core.constants.gender import Gender
from core.models.base import CoreModel

from .lab_exam_field import LabExamField


class ClinicalReference(CoreModel):
    """
    Define intervalos de referência laboratoriais.

    Pode variar por:
    • sex
    • faixa etária
    • exam_field

    Também define limites críticos clínicos.
    """

    prefix = "REF"

    exam_field = models.ForeignKey(
        LabExamField,
        verbose_name="Campo de exame",
        db_column="exam_field_id",
        on_delete=models.CASCADE,
        related_name="referencias",
    )

    sex = models.CharField(
        db_column="sex",
        verbose_name="Sexo",
        max_length=10,
        choices=Gender.choices,
        null=True,
        blank=True,
        help_text="Se vazio, aplica-se a ambos os sexos.",
    )

    minimum_age_days = models.PositiveIntegerField(
        db_column="minimum_age_days",
        verbose_name="Idade mínima (dias)",
        null=True,
        blank=True,
        help_text="Idade mínima em dias.",
    )

    maximum_age_days = models.PositiveIntegerField(
        db_column="maximum_age_days",
        verbose_name="Idade máxima (dias)",
        null=True,
        blank=True,
        help_text="Idade máxima em dias.",
    )

    minimum_value = models.DecimalField(
        db_column="minimum_value",
        verbose_name="Valor mínimo",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    maximum_value = models.DecimalField(
        db_column="maximum_value",
        verbose_name="Valor máximo",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    critical_low = models.DecimalField(
        db_column="critical_low",
        verbose_name="Limite crítico baixo",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    critical_high = models.DecimalField(
        db_column="critical_high",
        verbose_name="Limite crítico alto",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "clinico_referenciaclinica"
        verbose_name = "Referência clínica"
        verbose_name_plural = "Referências clínicas"
        ordering = [
            "exam_field",
            "sex",
            "minimum_age_days",
        ]

        indexes = [
            models.Index(fields=["exam_field"]),
            models.Index(fields=["sex"]),
            models.Index(fields=["minimum_age_days", "maximum_age_days"]),
        ]

        constraints = [
            # faixa etária válida
            models.CheckConstraint(
                check=(
                    Q(maximum_age_days__gte=F("minimum_age_days"))
                    | Q(minimum_age_days__isnull=True)
                    | Q(maximum_age_days__isnull=True)
                ),
                name="ref_idade_intervalo_valido",
            ),
            # intervalo clínico válido
            models.CheckConstraint(
                check=(
                    Q(maximum_value__gte=F("minimum_value")) | Q(minimum_value__isnull=True) | Q(maximum_value__isnull=True)
                ),
                name="ref_value_intervalo_valido",
            ),
            # intervalo crítico válido
            models.CheckConstraint(
                check=(
                    Q(critical_high__gte=F("critical_low"))
                    | Q(critical_low__isnull=True)
                    | Q(critical_high__isnull=True)
                ),
                name="ref_critico_intervalo_valido",
            ),
        ]

    # =====================================================
    # VALIDAÇÕES DE DOMÍNIO
    # =====================================================

    def clean(self):
        if self.minimum_value is not None and self.maximum_value is not None and self.minimum_value > self.maximum_value:
            raise ValidationError("Valor mínimo não pode ser maior que value máximo.")

        if self.critical_low is not None and self.critical_high is not None and self.critical_low > self.critical_high:
            raise ValidationError("Limite crítico baixo não pode ser maior que crítico alto.")

        if (
            self.minimum_age_days is not None
            and self.maximum_age_days is not None
            and self.minimum_age_days > self.maximum_age_days
        ):
            raise ValidationError("Idade mínima não pode ser maior que idade máxima.")

    # =====================================================
    # REPRESENTAÇÃO
    # =====================================================

    def __str__(self):
        sex = self.sex or "Todos"

        if self.minimum_value is not None and self.maximum_value is not None:
            intervalo = f"{self.minimum_value} - {self.maximum_value}"
        else:
            intervalo = "intervalo aberto"

        return f"{self.exam_field.name} ({sex}) {intervalo}"
