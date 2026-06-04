"""Linha contábil imutável (débito/crédito) ligada a um LedgerEntry."""

from decimal import Decimal  # Valores monetários

from django.core.exceptions import ValidationError  # Validação de domínio
from django.db import models  # ORM
from django.db.models import Q  # Constraints condicionais

from configuration.utils.django_compat import check_constraint
from core.mixins.model.position import ScopedPositionMixin
from core.models.base import CoreModel  # Modelo base


class LedgerLine(ScopedPositionMixin, CoreModel):
    """Linha de movimento contábil que compõe um lançamento."""

    prefix = "LL"  # Prefixo para IDs amigáveis

    # ===============================
    # RELACIONAMENTOS
    # ===============================

    entry = models.ForeignKey(
        "contabilidade.LedgerEntry",  # Cabeçalho do lançamento
        verbose_name="Lançamento",  # Rótulo
        on_delete=models.PROTECT,  # Protege registro original
        related_name="linhas",  # Nome reverso
        db_index=True,  # Índice
    )

    account = models.ForeignKey(
        "contabilidade.Account",  # Conta contábil
        verbose_name="Conta",  # Rótulo
        db_column="account_id",  # Coluna
        on_delete=models.PROTECT,  # Impede apagar conta usada
        db_index=True,  # Índice
    )

    # ===============================
    # CONTÁBIL
    # ===============================

    value = models.DecimalField(
        db_column="value",  # Coluna
        verbose_name="Valor",  # Rótulo
        max_digits=18,
        decimal_places=2,
    )

    nature = models.CharField(
        db_column="nature",  # Coluna
        verbose_name="Natureza",  # Rótulo
        max_length=1,
        choices=[
            ("D", "Débito"),
            ("C", "Crédito"),
        ],  # Valores permitidos
    )

    created_at = models.DateTimeField(
        db_column="created_at",  # Coluna
        verbose_name="Criado em",  # Rótulo
        auto_now_add=True,  # Preenche na criação
        db_index=True,  # Índice
    )

    # ===============================
    # META
    # ===============================

    class Meta:
        db_table = "contabilidade_ledgerline"  # Nome da tabela
        verbose_name = "Linha contábil"  # Nome legível
        verbose_name_plural = "Linhas contábeis"  # Nome plural
        ordering = ["entry", "position", "id"]
        indexes = [
            models.Index(fields=["entry"]),
            models.Index(fields=["tenant", "account", "created_at"]),
            models.Index(fields=["tenant", "entry"]),
        ]

        constraints = [
            check_constraint(
                condition=Q(value__gt=0),  # Valor deve ser positivo
                name="ledgerline_value_positivo",
            ),
        ]

    position_scope_fields = ("entry",)

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

        self.full_clean()  # Garante validações antes de persistir
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RuntimeError("LedgerLine é imutável.")

    def __str__(self):
        """Mostra conta, natureza e valor."""
        return f"{self.account_id} | {self.nature} | {self.value}"
