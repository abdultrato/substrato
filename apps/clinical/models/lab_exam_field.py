"""Campos de resultado de um exame laboratorial (ex.: glicose, hemoglobina)."""

from decimal import Decimal

from django.db import models

from core.constants.laboratory.result_type import ResultType
from core.constants.laboratory.units import DefaultUnit
from core.mixins.model.position import ScopedPositionMixin
from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import CoreModel


class LabExamField(TenantPropagationMixin, ScopedPositionMixin, CoreModel):
    """Campo mensurado de um exame laboratorial (valor numérico, texto etc.)."""

    tenant_source = "exam"
    prefix = "CMP"
    name_preserve_case = True

    exam = models.ForeignKey(

        "clinical.LabExam",

        db_column="exam_id",
        on_delete=models.CASCADE,
        related_name="campos",
        verbose_name="Exame laboratorial",
    )

    type = models.CharField(

        db_column="type",

        max_length=20,
        choices=ResultType.choices,
        verbose_name="Tipo de parâmetro",
    )

    unit = models.CharField(

        db_column="unit",

        max_length=30,
        choices=DefaultUnit.choices,
        default=DefaultUnit.P_UL,
        verbose_name="Unidade de medida",
    )

    # intervalos normais
    reference_min = models.DecimalField(
        db_column="reference_min",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Referência mínima",
    )

    reference_max = models.DecimalField(

        db_column="reference_max",

        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Referência máxima",
    )

    # limites críticos
    critical_min = models.DecimalField(
        db_column="critical_min",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Valor crítico mínimo",
    )

    critical_max = models.DecimalField(

        db_column="critical_max",

        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Valor crítico máximo",
    )

    # delta check
    max_delta = models.DecimalField(
        db_column="max_delta",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Delta máximo permitido",
    )

    class Meta:
        db_table = "clinico_examecampo"
        verbose_name = "parâmetro"
        verbose_name_plural = "parâmetros do exam"
        ordering = ["exam", "position", "id"]

    position_scope_fields = ("exam",)

    def __str__(self):
        return self.name

    # =====================================================
    # INTERVALO DE REFERÊNCIA FORMATADO
    # =====================================================

    @property
    def reference(self):
        """
        Retorna o intervalo de referência formatado.
        Exemplo:
        4.0 - 10.0
        >= 4.0
        <= 10.0
        """
        if self.reference_min is None and self.reference_max is None:
            return None

        if self.reference_min is not None and self.reference_max is not None:
            return f"{self.reference_min} - {self.reference_max}"

        if self.reference_min is not None:
            return f">= {self.reference_min}"

        if self.reference_max is not None:
            return f"<= {self.reference_max}"
        return None

    # =====================================================
    # INTERPRETAÇÃO BÁSICA
    # =====================================================

    def interpret_result(self, value):
        if value is None:
            return None

        try:
            value = Decimal(value)
        except Exception:
            return None

        # valores críticos
        if self.critical_min is not None and value < self.critical_min:
            return "↓↓"

        if self.critical_max is not None and value > self.critical_max:
            return "↑↑"

        # intervalo normal
        if self.reference_min is not None and value < self.reference_min:
            return "↓"

        if self.reference_max is not None and value > self.reference_max:
            return "↑"

        return "N"
