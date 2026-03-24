from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from infrastructure.orm.fields.dinheiro_field import DinheiroField
from core.models.base import CoreModel


class ConsultationSpecialty(CoreModel):
    """
    Especialidade / tipo de consulta com preço base.

    O frontend usa esta tabela como "choices" na marcação.
    """

    prefixo = "ESP"

    descricao = models.TextField(verbose_name="Descrição", blank=True, default="")

    preco_base = DinheiroField(verbose_name="Preço base", default=Decimal("0.00"))

    iva_percentual = models.DecimalField(
        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("16.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Taxa de IVA aplicada ao serviço de consulta (0 a 100).",
    )

    ativo = models.BooleanField(verbose_name="Ativo", default=True, db_index=True)

    class Meta:
        verbose_name = "Especialidade (Consulta)"
        verbose_name_plural = "Especialidades (Consulta)"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["inquilino", "ativo", "nome"]),
        ]

    def clean(self):
        super().clean()

        if not (self.nome or "").strip():
            raise ValidationError({"nome": "Informe o nome da especialidade."})

        if self.preco_base is None or self.preco_base < Decimal("0.00"):
            raise ValidationError({"preco_base": "Preço base inválido."})

    def __str__(self) -> str:
        return self.nome
