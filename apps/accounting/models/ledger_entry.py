from django.db import models
from django.db.models import Q

from core.models.base import CoreModel


class LedgerEntry(
    CoreModel,
):
    prefix = "LGENT"

    # ===============================
    # IDENTIFICAÇÃO
    # ===============================

    external_reference = models.CharField(
        db_column="external_reference",
        verbose_name="Referência externa",
        max_length=120,
        db_index=True,
    )

    idempotency_key = models.CharField(
        verbose_name="Chave de idempotência",
        max_length=150,
        null=True,
        blank=True,
    )

    # ===============================
    # CONTÁBIL
    # ===============================

    accounting_date = models.DateField(
        db_column="accounting_date",
        verbose_name="Data contábil",
        db_index=True,
    )

    description = models.CharField(
        db_column="description",
        verbose_name="Descrição",
        max_length=255,
    )

    # ===============================
    # REVERSÃO
    # ===============================

    reversed = models.BooleanField(
        db_column="reversed",
        verbose_name="Revertido",
        default=False,
        db_index=True,
    )

    reversal_of = models.OneToOneField(
        "self",
        verbose_name="Reversão de",
        db_column="reversal_of_id",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="reversao",
    )

    reversal_reason = models.TextField(
        db_column="reversal_reason",
        verbose_name="Motivo da reversão",
        null=True,
        blank=True,
    )

    # ===============================
    # AUDITORIA
    # ===============================

    created_at = models.DateTimeField(
        db_column="created_at",
        verbose_name="Criado em",
        auto_now_add=True,
        db_index=True,
    )

    # ===============================
    # INTEGRIDADE / ANTIFRAUDE
    # ===============================

    previous_hash = models.CharField(
        db_column="previous_hash",
        verbose_name="Hash anterior",
        max_length=64,
        null=True,
        blank=True,
        db_index=True,
    )

    current_hash = models.CharField(
        db_column="current_hash",
        verbose_name="Hash atual",
        max_length=64,
        null=True,
        blank=True,
        unique=True,
    )

    class Meta:
        db_table = "contabilidade_ledgerentry"
        verbose_name = "Lançamento contábil"
        verbose_name_plural = "Lançamentos contábeis"
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
                condition=Q(
                    idempotency_key__isnull=False,
                ),
                name="unique_ledger_idempotency",
            ),
        ]

    # ======================================
    # 🔐 IMUTABILIDADE FORTE
    # ======================================

    def save(
        self,
        *args,
        **kwargs,
    ):
        if self.pk:
            raise RuntimeError(
                "LedgerEntry é imutável.",
            )
        return super().save(
            *args,
            **kwargs,
        )

    def delete(
        self,
        *args,
        **kwargs,
    ):
        raise RuntimeError(
            "LedgerEntry é imutável.",
        )
