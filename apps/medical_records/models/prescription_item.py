from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from core.models.base import NoNameCoreModel


class PrescriptionItem(NoNameCoreModel):
    """
    Item de prescrição do Cardex (Prontuário).

    Associa uma medicação a uma dosagem e um esquema de administração.
    """

    prefix = "PRTI"

    class DosageUnit(models.TextChoices):
        MG = "MG", "mg"
        ML = "ML", "ml"
        G = "G", "g"
        L = "L", "L"
        KG = "KG", "kg"

    UnidadeDosagem = DosageUnit

    record = models.ForeignKey(

        "prontuario.MedicalRecordEntry",

        db_column="registro_id",
        verbose_name="Cardex",
        on_delete=models.CASCADE,
        related_name="itens_prescription",
        db_index=True,
    )

    medication = models.ForeignKey(

        "farmacia.Product",

        db_column="medicacao_id",
        verbose_name="Medicação",
        on_delete=models.PROTECT,
        related_name="prescricoes_prontuario",
        db_index=True,
    )

    dosage_value = models.DecimalField(

        db_column="dosagem_valor",

        verbose_name="Dosagem",
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Quantidade da dose (ex.: 500).",
    )

    dosage_unit = models.CharField(

        db_column="dosagem_unidade",

        verbose_name="Unidade da dosagem",
        max_length=3,
        choices=DosageUnit.choices,
        default=DosageUnit.MG,
        db_index=True,
    )

    interval_hours = models.PositiveSmallIntegerField(

        db_column="intervalo_horas",

        verbose_name="Intervalo (hours)",
        null=True,
        blank=True,
        help_text="Intervalo entre doses. Obrigatório quando houver mais de uma dose.",
    )

    dose_count = models.PositiveSmallIntegerField(

        db_column="numero_doses",

        verbose_name="Número de doses",
        default=1,
        help_text="Quantidade total de doses. Para dose única, informe 1.",
    )

    notes = models.TextField(

        db_column="observacoes",

        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "prontuario_prescricaoitem"
        verbose_name = "Item de Prescrição"
        verbose_name_plural = "Itens de Prescrição"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "record"]),
            models.Index(fields=["tenant", "medication"]),
        ]

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
            self.tenant_id = self.record.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        med = getattr(self.medication, "name", None) or "Medicação"
        return f"{med} - {self.dosage_value}{self.dosage_unit}"
