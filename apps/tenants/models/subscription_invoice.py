"""Fatura de assinatura: o Substrato cobra o tenant pelo uso da plataforma.

Distinta da fatura clínica (`faturamento.Invoice`), que é o tenant cobrando os
seus próprios pacientes. Aqui o "cliente" é o próprio tenant e o "fornecedor" é
a plataforma.
"""

from decimal import Decimal

from django.db import models
from django.db.models import Q
from django.utils import timezone

from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField

DEFAULT_CURRENCY = "MZN"


class SubscriptionInvoice(NoNameCoreModel):
    """Fatura de um período de assinatura de um tenant."""

    prefix = "SINV"

    class Status(models.TextChoices):
        OPEN = "ABERTA", "Aberta"
        PAID = "PAGA", "Paga"
        VOID = "ANULADA", "Anulada"
        UNCOLLECTIBLE = "INCOBRAVEL", "Incobrável"

    subscription = models.ForeignKey(
        "inquilinos.TenantSubscription",
        db_column="subscription_id",
        verbose_name="Assinatura",
        on_delete=models.PROTECT,
        related_name="invoices",
        db_index=True,
    )

    period_start = models.DateField(
        db_column="period_start", verbose_name="Início do período", db_index=True)
    period_end = models.DateField(
        db_column="period_end", verbose_name="Fim do período")

    amount = MoneyField(verbose_name="Valor", default=Decimal("0.00"))
    currency = models.CharField(
        db_column="currency", verbose_name="Moeda", max_length=3, default=DEFAULT_CURRENCY)

    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )

    due_date = models.DateField(
        db_column="due_date", verbose_name="Vencimento", blank=True, null=True, db_index=True)
    issued_at = models.DateTimeField(
        db_column="issued_at", verbose_name="Emitida em", default=timezone.now)
    paid_at = models.DateTimeField(
        db_column="paid_at", verbose_name="Paga em", blank=True, null=True)

    class Meta:
        db_table = "inquilinos_fatura_assinatura"
        verbose_name = "Fatura de Assinatura"
        verbose_name_plural = "Faturas de Assinatura"
        ordering = ["-period_start"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["subscription", "status"]),
        ]
        constraints = [
            # Uma fatura por período/assinatura (idempotência na geração).
            models.UniqueConstraint(
                fields=["subscription", "period_start"],
                condition=Q(deleted=False),
                name="uniq_subinvoice_subscription_period",
            ),
        ]

    def mark_paid(self, when=None):
        self.status = self.Status.PAID
        self.paid_at = when or timezone.now()
        self.save(update_fields=["status", "paid_at"])

    def void(self):
        self.status = self.Status.VOID
        self.save(update_fields=["status"])

    def mark_uncollectible(self):
        self.status = self.Status.UNCOLLECTIBLE
        self.save(update_fields=["status"])

    def is_paid(self) -> bool:
        return self.status == self.Status.PAID

    def __str__(self) -> str:
        return f"{self.custom_id or self.pk} [{self.amount} {self.currency}] {self.status}"
