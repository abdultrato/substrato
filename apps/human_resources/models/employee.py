from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from infrastructure.orm.fields.dinheiro_field import DinheiroField
from core.models.base import CoreModel


class Employee(CoreModel):
    """
    Funcionário (MVP).

    Observação: o vínculo com usuário (login) é feito via Perfil Profissional.
    """

    prefixo = "FUN"

    class Estado(models.TextChoices):
        ATIVO = "ATIVO", "Ativo"
        INATIVO = "INATIVO", "Inativo"

    cargo = models.ForeignKey(
        "recursos_humanos.JobTitle",
        verbose_name="Cargo",
        on_delete=models.PROTECT,
        related_name="funcionarios",
        null=True,
        blank=True,
        db_index=True,
    )

    profissao = models.CharField(
        verbose_name="Profissão",
        max_length=120,
        blank=True,
        default="",
        db_index=True,
    )

    nuit = models.CharField(
        verbose_name="NUIT",
        max_length=30,
        blank=True,
        default="",
        db_index=True,
    )

    nib = models.CharField(
        verbose_name="NIB / Conta bancária",
        max_length=60,
        blank=True,
        default="",
    )

    numero_documento = models.CharField(
        verbose_name="Número do documento",
        max_length=60,
        blank=True,
        default="",
        db_index=True,
    )

    email = models.EmailField(verbose_name="E-mail", blank=True, default="")
    telefone = models.CharField(verbose_name="Telefone", max_length=30, blank=True, default="")

    data_admissao = models.DateField(verbose_name="Data de admissão", default=timezone.now)
    estado = models.CharField(
        verbose_name="Estado",
        max_length=10,
        choices=Estado.choices,
        default=Estado.ATIVO,
        db_index=True,
    )

    salario_nominal = DinheiroField(verbose_name="Salário nominal", default=Decimal("0.00"))
    aumento_salarial = DinheiroField(
        verbose_name="Aumento salarial",
        default=Decimal("0.00"),
        help_text="Valor adicional por promoção/aumento (somado ao salário nominal).",
    )
    horas_base_mes = models.PositiveSmallIntegerField(
        verbose_name="Horas base (mês)",
        default=176,
        help_text="Horas contratuais base por mês (ex.: 176).",
    )

    class Meta:
        verbose_name = "Funcionário"
        verbose_name_plural = "Funcionários"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["inquilino", "estado"]),
            models.Index(fields=["inquilino", "cargo"]),
            models.Index(fields=["inquilino", "nuit"]),
            models.Index(fields=["inquilino", "numero_documento"]),
        ]

    @property
    def salario_atual(self) -> Decimal:
        """Salário nominal + aumento salarial."""
        base = self.salario_nominal or Decimal("0.00")
        aumento = self.aumento_salarial or Decimal("0.00")
        try:
            return (Decimal(base) + Decimal(aumento)).quantize(Decimal("0.01"))
        except Exception:
            return Decimal("0.00")

    def clean(self):
        super().clean()

        if self.salario_nominal is not None and self.salario_nominal < Decimal("0.00"):
            raise ValidationError({"salario_nominal": "Salário nominal inválido."})

        if self.aumento_salarial is not None and self.aumento_salarial < Decimal("0.00"):
            raise ValidationError({"aumento_salarial": "Aumento salarial inválido."})

        if self.cargo_id and self.inquilino_id and self.cargo.inquilino_id != self.inquilino_id:
            raise ValidationError({"cargo": "Cargo e funcionário devem pertencer ao mesmo inquilino."})
