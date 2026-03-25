from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from core.models.base import CoreModel


class LedgerLine(CoreModel):
    prefix = "LL"

    # ===============================
    # RELACIONAMENTOS
    # ===============================

    entry = models.ForeignKey(
        "contabilidade.LedgerEntry",
        on_delete=models.PROTECT,
        related_name="linhas",
        db_index=True,
    )

    account = models.ForeignKey(

        "contabilidade.Account",

        db_column="account_id",
        on_delete=models.PROTECT,
        db_index=True,
    )

    # ===============================
    # CONTÁBIL
    # ===============================

    value = models.DecimalField(

        db_column="value",

        max_digits=18,
        decimal_places=2,
    )

    nature = models.CharField(

        db_column="nature",

        max_length=1,
        choices=[
            ("D", "Débito"),
            ("C", "Crédito"),
        ],
    )

    created_at = models.DateTimeField(
        db_column="created_at",
        auto_now_add=True,
        db_index=True,
    )

    # ===============================
    # META
    # ===============================

    class Meta:
        db_table = "contabilidade_ledgerline"
        indexes = [
            models.Index(fields=["entry"]),
            models.Index(fields=["tenant", "account", "created_at"]),
            models.Index(fields=["tenant", "entry"]),
        ]

        constraints = [
            models.CheckConstraint(
                check=Q(value__gt=0),
                name="ledgerline_value_positivo",
            ),
        ]

    # ======================================
    # 🔎 VALIDAÇÕES DE DOMÍNIO
    # ======================================

    def clean(self):

        if self.value is None or self.value <= Decimal("0.00"):
            raise ValidationError("Valor deve ser maior que zero.")

        if self.nature not in ("D", "C"):
            raise ValidationError("Natureza inválida.")

        if not self.entry_id:
            raise ValidationError("Entry é obrigatório.")

        if not self.account_id:
            raise ValidationError("Conta é obrigatória.")

        # 🔐 Multi-tenant enforcement
        if self.tenant_id and self.entry_id and self.entry.tenant_id != self.tenant_id:
            raise ValidationError("Inquilino da linha difere do LedgerEntry.")

        if self.tenant_id and self.account_id and self.account.tenant_id != self.tenant_id:
            raise ValidationError("Inquilino da linha difere da Conta.")

        # 🔒 Segurança adicional
        if hasattr(self.entry, "reversed") and self.entry.reversed:
            raise ValidationError("Não é permitido adicionar linhas a um LedgerEntry reversed.")

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
        return f"{self.account_id} | {self.nature} | {self.value}"
