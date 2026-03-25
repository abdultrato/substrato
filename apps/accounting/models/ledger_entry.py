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

        max_length=120,
        db_index=True,
    )

    idempotency_key = models.CharField(
        max_length=150,
        null=True,
        blank=True,
    )

    # ===============================
    # CONTÁBIL
    # ===============================

    accounting_date = models.DateField(

        db_column="accounting_date",

        db_index=True,
    )

    description = models.CharField(

        db_column="description",

        max_length=255,
    )

    # ===============================
    # REVERSÃO
    # ===============================

    reversed = models.BooleanField(

        db_column="reversed",

        default=False,
        db_index=True,
    )

    reversal_of = models.OneToOneField(

        "self",

        db_column="reversal_of_id",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="reversao",
    )

    reversal_reason = models.TextField(

        db_column="reversal_reason",

        null=True,
        blank=True,
    )

    # ===============================
    # AUDITORIA
    # ===============================

    created_at = models.DateTimeField(
        db_column="created_at",
        auto_now_add=True,
        db_index=True,
    )

    # ===============================
    # INTEGRIDADE / ANTIFRAUDE
    # ===============================

    previous_hash = models.CharField(

        db_column="previous_hash",

        max_length=64,
        null=True,
        blank=True,
        db_index=True,
    )

    current_hash = models.CharField(

        db_column="current_hash",

        max_length=64,
        null=True,
        blank=True,
        unique=True,
    )

    class Meta:
        db_table = "contabilidade_ledgerentry"
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
