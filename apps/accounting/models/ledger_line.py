from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from core.models.base import CoreModel


class LedgerLine(CoreModel):
    prefixo = "LL"

    # ===============================
    # RELACIONAMENTOS
    # ===============================

    entry = models.ForeignKey(
        "contabilidade.LedgerEntry",
        on_delete=models.PROTECT,
        related_name="linhas",
        db_index=True,
    )

    conta = models.ForeignKey(
        "contabilidade.Account",
        on_delete=models.PROTECT,
        db_index=True,
    )

    # ===============================
    # CONTÁBIL
    # ===============================

    valor = models.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    natureza = models.CharField(
        max_length=1,
        choices=[
            ("D", "Débito"),
            ("C", "Crédito"),
        ],
    )

    criado_em = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    # ===============================
    # META
    # ===============================

    class Meta:
        indexes = [
            models.Index(fields=["entry"]),
            models.Index(fields=["inquilino", "conta", "criado_em"]),
            models.Index(fields=["inquilino", "entry"]),
        ]

        constraints = [
            models.CheckConstraint(
                check=Q(valor__gt=0),
                name="ledgerline_valor_positivo",
            ),
        ]

    # ======================================
    # 🔎 VALIDAÇÕES DE DOMÍNIO
    # ======================================

    def clean(self):

        if self.valor is None or self.valor <= Decimal("0.00"):
            raise ValidationError("Valor deve ser maior que zero.")

        if self.natureza not in ("D", "C"):
            raise ValidationError("Natureza inválida.")

        if not self.entry_id:
            raise ValidationError("Entry é obrigatório.")

        if not self.conta_id:
            raise ValidationError("Conta é obrigatória.")

        # 🔐 Multi-tenant enforcement
        if self.inquilino_id and self.entry_id and self.entry.inquilino_id != self.inquilino_id:
            raise ValidationError("Inquilino da linha difere do LedgerEntry.")

        if self.inquilino_id and self.conta_id and self.conta.inquilino_id != self.inquilino_id:
            raise ValidationError("Inquilino da linha difere da Conta.")

        # 🔒 Segurança adicional
        if hasattr(self.entry, "revertido") and self.entry.revertido:
            raise ValidationError("Não é permitido adicionar linhas a um LedgerEntry revertido.")

    # ======================================
    # 🔐 IMUTABILIDADE FORTE
    # ======================================

    def save(self, *args, **kwargs):

        if self.pk:
            raise RuntimeError("LedgerLine é imutável.")

        self.full_clean()
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RuntimeError("LedgerLine é imutável.")

    def __str__(self):
        return f"{self.conta_id} | {self.natureza} | {self.valor}"
