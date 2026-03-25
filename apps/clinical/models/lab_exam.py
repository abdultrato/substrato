from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import CoreModel
from infrastructure.orm.fields.method_field import MethodField
from infrastructure.orm.fields.money_field import MoneyField
from infrastructure.orm.fields.sector_field import SectorField


class LabExam(PropagarInquilinoMixin, CoreModel):
    """
    Cadastro de exams laboratoriais.
    """

    fonte_tenant = "patient"
    prefix = "EXA"

    # =====================================================
    # CAMPOS
    # =====================================================

    turnaround_hours = models.PositiveIntegerField(

        db_column="turnaround_hours",

        verbose_name="Tempo de response (em hours)",
        default=24,
        help_text="Tempo de response em hours.",
    )

    price = MoneyField(

        db_column="price",

        verbose_name="Preço do exam",
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Preço do exam.",
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
        help_text="Taxa de IVA aplicada ao exam (0 a 100).",
    )

    applies_vat_by_default = models.BooleanField(

        db_column="applies_vat_by_default",

        verbose_name="Aplicar IVA por padrão",
        default=True,
        help_text="Desmarque se este exam normalmente não deve ter IVA.",
    )

    method = MethodField(
        verbose_name="Método do exam",
        db_index=True,
    )

    sector = SectorField(
        verbose_name="Setor do exam",
        db_index=True,
    )

    # =====================================================
    # META
    # =====================================================

    class Meta:
        db_table = "clinico_exame"
        verbose_name = "Exame"
        verbose_name_plural = "Exames"

        ordering = ["name", "created_at"]

        indexes = [
            models.Index(fields=["sector", "deleted"]),
            models.Index(fields=["method"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["sector", "name"],
                condition=Q(deleted=False),
                name="unique_name_exam_por_sector_nao_deleted",
            ),
            models.CheckConstraint(
                check=Q(turnaround_hours__gt=0),
                name="turnaround_hours_positivo",
            ),
            models.CheckConstraint(
                check=Q(price__gte=0),
                name="price_nao_negativo",
            ),
        ]

    # =====================================================
    # VALIDAÇÃO DE DOMÍNIO
    # =====================================================

    def clean(self):
        super().clean()

        erros = {}

        if not self.name:
            erros["name"] = "O exam deve possuir um name."

        if self.price is None:
            erros["price"] = "O exam deve possuir um preço."

        if self.price == Decimal("0.00"):
            erros["price"] = "Exame não pode ter preço zero."

        if self.turnaround_hours <= 0:
            erros["turnaround_hours"] = "TRL deve ser maior que zero."

        if erros:
            raise ValidationError(erros)

    # =====================================================
    # REPRESENTAÇÃO
    # =====================================================

    def __str__(self):
        return f"{self.name or 'exam sem name'}"

