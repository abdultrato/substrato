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
    Cadastro de exames laboratoriais.
    """

    fonte_inquilino = "paciente"
    prefixo = "EXA"

    # =====================================================
    # CAMPOS
    # =====================================================

    trl_horas = models.PositiveIntegerField(
        verbose_name="Tempo de resposta (em horas)",
        default=24,
        help_text="Tempo de resposta em horas.",
    )

    preco = MoneyField(
        verbose_name="Preço do exame",
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Preço do exame.",
    )

    iva_percentual = models.DecimalField(
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

    aplica_iva_por_padrao = models.BooleanField(
        verbose_name="Aplicar IVA por padrão",
        default=True,
        help_text="Desmarque se este exame normalmente não deve ter IVA.",
    )

    metodo = MethodField(
        verbose_name="Método do exame",
        db_index=True,
    )

    setor = SectorField(
        verbose_name="Setor do exame",
        db_index=True,
    )

    # =====================================================
    # META
    # =====================================================

    class Meta:
        db_table = "clinico_exame"
        verbose_name = "Exame"
        verbose_name_plural = "Exames"

        ordering = ["nome", "criado_em"]

        indexes = [
            models.Index(fields=["setor", "deletado"]),
            models.Index(fields=["metodo"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["setor", "nome"],
                condition=Q(deletado=False),
                name="unique_nome_exame_por_setor_nao_deletado",
            ),
            models.CheckConstraint(
                check=Q(trl_horas__gt=0),
                name="trl_horas_positivo",
            ),
            models.CheckConstraint(
                check=Q(preco__gte=0),
                name="preco_nao_negativo",
            ),
        ]

    # =====================================================
    # VALIDAÇÃO DE DOMÍNIO
    # =====================================================

    def clean(self):
        super().clean()

        erros = {}

        if not self.nome:
            erros["nome"] = "O exame deve possuir um nome."

        if self.preco is None:
            erros["preco"] = "O exame deve possuir um preço."

        if self.preco == Decimal("0.00"):
            erros["preco"] = "Exame não pode ter preço zero."

        if self.trl_horas <= 0:
            erros["trl_horas"] = "TRL deve ser maior que zero."

        if erros:
            raise ValidationError(erros)

    # =====================================================
    # REPRESENTAÇÃO
    # =====================================================

    def __str__(self):
        return f"{self.nome or 'exame sem nome'}"

