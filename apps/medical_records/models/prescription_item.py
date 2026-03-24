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

    prefixo = "PRTI"

    class DosageUnit(models.TextChoices):
        MG = "MG", "mg"
        ML = "ML", "ml"
        G = "G", "g"
        L = "L", "L"
        KG = "KG", "kg"

    UnidadeDosagem = DosageUnit

    registro = models.ForeignKey(
        "prontuario.MedicalRecordEntry",
        verbose_name="Cardex",
        on_delete=models.CASCADE,
        related_name="itens_prescricao",
        db_index=True,
    )

    medicacao = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Medicação",
        on_delete=models.PROTECT,
        related_name="prescricoes_prontuario",
        db_index=True,
    )

    dosagem_valor = models.DecimalField(
        verbose_name="Dosagem",
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Quantidade da dose (ex.: 500).",
    )

    dosagem_unidade = models.CharField(
        verbose_name="Unidade da dosagem",
        max_length=3,
        choices=DosageUnit.choices,
        default=DosageUnit.MG,
        db_index=True,
    )

    intervalo_horas = models.PositiveSmallIntegerField(
        verbose_name="Intervalo (horas)",
        null=True,
        blank=True,
        help_text="Intervalo entre doses. Obrigatório quando houver mais de uma dose.",
    )

    numero_doses = models.PositiveSmallIntegerField(
        verbose_name="Número de doses",
        default=1,
        help_text="Quantidade total de doses. Para dose única, informe 1.",
    )

    observacoes = models.TextField(
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        verbose_name = "Item de Prescrição"
        verbose_name_plural = "Itens de Prescrição"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "registro"]),
            models.Index(fields=["inquilino", "medicacao"]),
        ]

    def clean(self):
        super().clean()

        if self.registro_id and self.inquilino_id and self.registro.inquilino_id != self.inquilino_id:
            raise ValidationError({"registro": "Cardex e item de prescrição devem pertencer ao mesmo inquilino."})

        if self.medicacao_id and self.inquilino_id and self.medicacao.inquilino_id != self.inquilino_id:
            raise ValidationError({"medicacao": "Medicação e item de prescrição devem pertencer ao mesmo inquilino."})

        # Garantir que o produto selecionado é de tipo "Medicamento".
        if self.medicacao_id:
            try:
                from apps.pharmacy.models.product import Product

                if self.medicacao.tipo != Product.TipoProduto.MEDICAMENTO:
                    raise ValidationError({"medicacao": "Selecione um produto do tipo Medicamento."})
            except Exception:
                # Fallback: se não houver tipo/enum, não bloqueia.
                pass

        if self.numero_doses <= 0:
            raise ValidationError({"numero_doses": "Número de doses deve ser maior que zero."})

        if self.numero_doses == 1:
            if self.intervalo_horas is not None:
                raise ValidationError({"intervalo_horas": "Intervalo não é permitido para dose única."})
        else:
            if self.intervalo_horas is None or self.intervalo_horas <= 0:
                raise ValidationError({"intervalo_horas": "Intervalo é obrigatório quando houver múltiplas doses."})

        if self.dosagem_valor is None or self.dosagem_valor <= Decimal("0.00"):
            raise ValidationError({"dosagem_valor": "Dosagem deve ser maior que zero."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.registro_id:
            self.inquilino_id = self.registro.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        med = getattr(self.medicacao, "nome", None) or "Medicação"
        return f"{med} - {self.dosagem_valor}{self.dosagem_unidade}"
