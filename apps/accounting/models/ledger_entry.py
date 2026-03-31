"""Lançamento contábil imutável (cabeçalho)."""

from django.db import models  # ORM
from django.db.models import Q  # Para constraints condicionais

from core.models.base import CoreModel  # Modelo base


class LedgerEntry(CoreModel):
    """Cabeçalho de lançamento contábil (imutável)."""

    prefix = "LGENT"  # Prefixo de IDs amigáveis

    # ===============================
    # IDENTIFICAÇÃO
    # ===============================

    external_reference = models.CharField(
        db_column="external_reference",  # Coluna
        verbose_name="Referência externa",  # Rótulo
        max_length=120,  # Tamanho
        db_index=True,  # Índice
    )

    idempotency_key = models.CharField(
        verbose_name="Chave de idempotência",  # Rótulo
        max_length=150,
        null=True,
        blank=True,
    )

    # ===============================
    # CONTÁBIL
    # ===============================

    accounting_date = models.DateField(
        db_column="accounting_date",  # Coluna
        verbose_name="Data contábil",  # Rótulo
        db_index=True,  # Índice para consultas por data
    )

    description = models.CharField(
        db_column="description",  # Coluna
        verbose_name="Descrição",  # Rótulo
        max_length=255,  # Tamanho
    )

    # ===============================
    # REVERSÃO
    # ===============================

    reversed = models.BooleanField(
        db_column="reversed",  # Coluna
        verbose_name="Revertido",  # Rótulo
        default=False,  # Valor padrão
        db_index=True,  # Índice para consultas rápidas
    )

    reversal_of = models.OneToOneField(
        "self",  # Liga a outro lançamento
        verbose_name="Reversão de",  # Rótulo
        db_column="reversal_of_id",  # Coluna
        null=True,
        blank=True,
        on_delete=models.PROTECT,  # Protege lançamento original
        related_name="reversao",  # Nome reverso
    )

    reversal_reason = models.TextField(
        db_column="reversal_reason",  # Coluna
        verbose_name="Motivo da reversão",  # Rótulo
        null=True,
        blank=True,
    )

    # ===============================
    # AUDITORIA
    # ===============================

    created_at = models.DateTimeField(
        db_column="created_at",  # Coluna
        verbose_name="Criado em",  # Rótulo
        auto_now_add=True,  # Preenche apenas na criação
        db_index=True,  # Índice
    )

    # ===============================
    # INTEGRIDADE / ANTIFRAUDE
    # ===============================

    previous_hash = models.CharField(
        db_column="previous_hash",  # Coluna
        verbose_name="Hash anterior",  # Rótulo
        max_length=64,
        null=True,
        blank=True,
        db_index=True,  # Índice para auditoria
    )

    current_hash = models.CharField(
        db_column="current_hash",  # Coluna
        verbose_name="Hash atual",  # Rótulo
        max_length=64,
        null=True,
        blank=True,
        unique=True,  # Hash não pode se repetir
    )

    class Meta:
        db_table = "contabilidade_ledgerentry"  # Nome da tabela
        verbose_name = "Lançamento contábil"  # Nome legível
        verbose_name_plural = "Lançamentos contábeis"  # Nome plural
        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "accounting_date",
                ],
            ),
            models.Index(
                fields=[
                    "tenant",
                    "created_at",
                ],
            ),
            models.Index(
                fields=[
                    "external_reference",
                ],
            ),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "idempotency_key",
                ],
                condition=Q(idempotency_key__isnull=False),  # Só aplica quando chave existe
                name="unique_ledger_idempotency",
            ),
        ]

    # ======================================
    # 🔐 IMUTABILIDADE FORTE
    # ======================================

    def save(self, *args, **kwargs):
        """Impedir alterações após criado (imutável)."""
        if self.pk:
            raise RuntimeError("LedgerEntry é imutável.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Não permitir deleção para preservar trilha auditável."""
        raise RuntimeError("LedgerEntry é imutável.")
