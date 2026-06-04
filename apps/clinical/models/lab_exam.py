"""Catálogo de exames laboratoriais com preços e restrições por método/setor."""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from configuration.utils.django_compat import check_constraint
from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import CoreModel
from infrastructure.orm.fields.method_field import MethodField
from infrastructure.orm.fields.money_field import MoneyField
from infrastructure.orm.fields.sector_field import SectorField


class LabExam(TenantPropagationMixin, CoreModel):
    """
    Cadastro de exams laboratoriais.
    """

    tenant_source = "patient"
    prefix = "EXA"  # Prefixo para IDs amigáveis

    # =====================================================
    # CAMPOS
    # =====================================================

    turnaround_hours = models.PositiveIntegerField(

        db_column="turnaround_hours",

        verbose_name="Tempo de resposta (em horas)",
        default=24,
        help_text="Tempo de resposta em horas.",

    )

    price = MoneyField(

        db_column="price",

        verbose_name="Preço do exame",
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Preço do exame.",
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
        help_text="Taxa de IVA aplicada ao exame (0 a 100).",
    )

    applies_vat_by_default = models.BooleanField(

        db_column="applies_vat_by_default",

        verbose_name="Aplicar IVA por padrão",
        default=True,
        help_text="Desmarque se este exame normalmente não deve ter IVA.",
    )

    method = MethodField(
        verbose_name="Método do exame",
        db_index=True,
    )

    sector = SectorField(
        verbose_name="Setor do exame",
        db_index=True,
    )
    sample_type = models.ForeignKey(
        "clinical.Sample",
        db_column="sample_id",
        on_delete=models.PROTECT,
        related_name="exams",
        verbose_name="Tipo de amostra",
    )
    sample_options = models.ManyToManyField(
        "clinical.Sample",
        blank=True,
        related_name="exam_sample_options",
        db_table="clinico_exame_opcoes_amostras",
        verbose_name="Opções de amostra",
        help_text=(
            "Amostras alternativas aceites pelo exame. "
            "O tipo de amostra principal também é considerado automaticamente."
        ),
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
            models.Index(fields=["sample_type"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["sector", "name"],
                condition=Q(deleted=False),
                name="unique_name_exam_por_sector_nao_deleted",
            ),
            check_constraint(
                condition=Q(turnaround_hours__gt=0),
                name="turnaround_hours_positivo",
            ),
            check_constraint(
                condition=Q(price__gte=0),
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

        if not self.sample_type_id:
            erros["sample_type"] = "Informe o tipo de amostra do exame."
        elif self.tenant_id and self.sample_type.tenant_id != self.tenant_id:
            erros["sample_type"] = "A amostra deve pertencer ao mesmo tenant do exame."

        if erros:
            raise ValidationError(erros)

    # =====================================================
    # REPRESENTAÇÃO
    # =====================================================

    def __str__(self):
        return f"{self.name or 'exam sem name'}"

    def get_sample_options(self):
        """
        Retorna as opções de amostra aceites pelo exame.
        Sempre inclui `sample_type` como fallback de compatibilidade.
        """
        options = list(self.sample_options.all().order_by("name", "id"))
        option_ids = {item.id for item in options if item.id}

        sample_type = getattr(self, "sample_type", None)
        if sample_type and sample_type.id and sample_type.id not in option_ids:
            options.insert(0, sample_type)

        return options
