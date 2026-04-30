from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from core.mixins.model.position import ScopedPositionMixin
from core.models.base import NoNameCoreModel


class PrescriptionItem(ScopedPositionMixin, NoNameCoreModel):
    """
    Item de prescrição do Cardex (Prontuário).

    Associa uma medicação a uma dosagem e um esquema de administração.
    """

    prefix = "PRTI"  # Prefixo de custom_id

    class DosageUnit(models.TextChoices):
        MG = "MG", "mg"
        ML = "ML", "ml"
        G = "G", "g"
        L = "L", "L"
        KG = "KG", "kg"

    UnidadeDosagem = DosageUnit

    record = models.ForeignKey(  # Cardex a que pertence
        "prontuario.MedicalRecordEntry",
        db_column="record_id",
        verbose_name="Cardex",
        on_delete=models.CASCADE,
        related_name="itens_prescription",
        db_index=True,
    )

    medication = models.ForeignKey(  # Produto do tipo medicamento
        "farmacia.Product",
        db_column="medication_id",
        verbose_name="Medicação",
        on_delete=models.PROTECT,
        related_name="prescricoes_prontuario",
        db_index=True,
    )

    dosage_value = models.DecimalField(  # Quantidade da dose
        db_column="dosage_value",
        verbose_name="Dosagem",
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Quantidade da dose (ex.: 500).",
    )

    dosage_unit = models.CharField(  # Unidade (mg, ml, etc.)
        db_column="dosage_unit",
        verbose_name="Unidade da dosagem",
        max_length=3,
        choices=DosageUnit.choices,
        default=DosageUnit.MG,
        db_index=True,
    )

    interval_hours = models.PositiveSmallIntegerField(  # Intervalo entre doses
        db_column="interval_hours",
        verbose_name="Intervalo (hours)",
        null=True,
        blank=True,
        help_text="Intervalo entre doses. Obrigatório quando houver mais de uma dose.",
    )

    dose_count = models.PositiveSmallIntegerField(  # Número total de doses
        db_column="dose_count",
        verbose_name="Número de doses",
        default=1,
        help_text="Quantidade total de doses. Para dose única, informe 1.",
    )

    notes = models.TextField(  # Observações adicionais
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "prontuario_prescricaoitem"  # Nome legado
        verbose_name = "Item de Prescrição"
        verbose_name_plural = "Itens de Prescrição"
        ordering = ["record", "position", "id"]
        indexes = [
            models.Index(fields=["tenant", "record"]),
            models.Index(fields=["tenant", "medication"]),
        ]

    position_scope_fields = ("record",)

    def clean(self):
        super().clean()

        if self.record_id and self.tenant_id and self.record.tenant_id != self.tenant_id:
            raise ValidationError({"record": "Cardex e item de prescrição devem pertencer ao mesmo tenant."})

        if self.medication_id and self.tenant_id and self.medication.tenant_id != self.tenant_id:
            raise ValidationError({"medication": "Medicação e item de prescrição devem pertencer ao mesmo tenant."})

        # Garantir que o product selecionado é de type "Medicamento".
        if self.medication_id:
            try:
                from apps.pharmacy.models.product import Product

                if self.medication.type != Product.ProductType.MEDICAMENTO:
                    raise ValidationError({"medication": "Selecione um product do type Medicamento."})
            except Exception:
                # Fallback: se não houver type/enum, não bloqueia.
                pass

        if self.dose_count <= 0:
            raise ValidationError({"dose_count": "Número de doses deve ser maior que zero."})

        if self.dose_count == 1:
            if self.interval_hours is not None:
                raise ValidationError({"interval_hours": "Intervalo não é permitido para dose única."})
        else:
            if self.interval_hours is None or self.interval_hours <= 0:
                raise ValidationError({"interval_hours": "Intervalo é obrigatório quando houver múltiplas doses."})

        if self.dosage_value is None or self.dosage_value <= Decimal("0.00"):
            raise ValidationError({"dosage_value": "Dosagem deve ser maior que zero."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.record_id:
            self.tenant_id = self.record.tenant_id  # Propaga tenant do cardex
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        med = getattr(self.medication, "name", None) or "Medicação"
        return f"{med} - {self.dosage_value}{self.dosage_unit}"
