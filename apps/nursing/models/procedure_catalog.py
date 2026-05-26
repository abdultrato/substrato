from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class ProcedureCatalog(CoreModel):
    """Catálogo de procedimentos de enfermagem (preço e materiais padrão)."""

    prefix = "PCAT"

    procedure_code = models.CharField(
        db_column="procedure_code",
        verbose_name="Código do procedimento",
        max_length=40,
        blank=True,
        default="",
        db_index=True,
        help_text="Código operacional/faturável do procedimento.",
    )

    description = models.TextField(

        db_column="description",

        verbose_name="Descrição", blank=True, default="")

    default_price = MoneyField(

        db_column="default_price",

        verbose_name="Preço padrão",
        default=Decimal("0.00"),
    )

    vat_percentage = models.DecimalField(

        db_column="vat_percentage",

        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("5.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Taxa de IVA aplicada ao procedimento (0 a 100).",
    )

    applies_vat_by_default = models.BooleanField(

        db_column="applies_vat_by_default",

        verbose_name="Aplicar IVA por padrão",
        default=True,
        help_text="Desmarque se este procedimento normalmente não deve ter IVA.",
    )

    estimated_duration_minutes = models.PositiveIntegerField(
        db_column="estimated_duration_minutes",
        verbose_name="Duração estimada (minutos)",
        default=0,
        help_text="Tempo médio esperado para execução do procedimento.",
    )

    active = models.BooleanField(
        db_column="active",
        verbose_name="Ativo",
        default=True,
        db_index=True,
    )

    class Meta:
        db_table = "enfermagem_procedimentocatalogo"
        verbose_name = "Catálogo de Procedimento"
        verbose_name_plural = "Catálogos de Procedimentos"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name or f"Procedimento {self.pk}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.procedure_code and self.custom_id:
            self.__class__.all_objects.filter(pk=self.pk).update(procedure_code=self.custom_id)
            self.procedure_code = self.custom_id
