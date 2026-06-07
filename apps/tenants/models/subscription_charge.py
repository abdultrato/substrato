"""Tentativa de cobrança de uma fatura de assinatura num gateway.

É a âncora de idempotência: cada cobrança tem uma `idempotency_key` única, o que
impede cobrar o mesmo período duas vezes (retries, webhooks repetidos, corridas).
"""

from decimal import Decimal

from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField

DEFAULT_CURRENCY = "MZN"


class SubscriptionCharge(NoNameCoreModel):
    prefix = "SCHG"

    class Status(models.TextChoices):
        PENDING = "PENDENTE", "Pendente"
        SUCCEEDED = "SUCESSO", "Sucesso"
        FAILED = "FALHOU", "Falhou"
        REFUNDED = "ESTORNADA", "Estornada"

    # Estados finais (não devem transicionar de novo).
    TERMINAL_STATUSES = ("SUCESSO", "FALHOU", "ESTORNADA")

    invoice = models.ForeignKey(
        "inquilinos.SubscriptionInvoice",
        db_column="invoice_id",
        verbose_name="Fatura",
        on_delete=models.PROTECT,
        related_name="charges",
        db_index=True,
    )

    gateway = models.CharField("Gateway", max_length=40, db_index=True)
    idempotency_key = models.CharField(
        "Chave de idempotência",
        db_column="idempotency_key",
        max_length=120,
        unique=True,
        db_index=True,
    )
    external_reference = models.CharField(
        "Referência externa (gateway)",
        db_column="external_reference",
        max_length=120,
        blank=True,
        default="",
        db_index=True,
    )

    amount = MoneyField(verbose_name="Valor", default=Decimal("0.00"))
    currency = models.CharField(
        db_column="currency", verbose_name="Moeda", max_length=3, default=DEFAULT_CURRENCY)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    gateway_response = models.JSONField(
        "Resposta do gateway", db_column="gateway_response", default=dict, blank=True)
    processed_at = models.DateTimeField(
        db_column="processed_at", verbose_name="Processada em", blank=True, null=True)

    class Meta:
        db_table = "inquilinos_cobranca_assinatura"
        verbose_name = "Cobrança de Assinatura"
        verbose_name_plural = "Cobranças de Assinatura"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["gateway", "status"]),
            models.Index(fields=["external_reference"]),
        ]

    @property
    def is_terminal(self) -> bool:
        return self.status in self.TERMINAL_STATUSES

    def mark_succeeded(self, *, external_reference=None, response=None):
        self.status = self.Status.SUCCEEDED
        if external_reference:
            self.external_reference = external_reference
        if response is not None:
            self.gateway_response = response
        self.processed_at = timezone.now()
        self.save(update_fields=["status", "external_reference", "gateway_response", "processed_at"])

    def mark_failed(self, *, response=None):
        self.status = self.Status.FAILED
        if response is not None:
            self.gateway_response = response
        self.processed_at = timezone.now()
        self.save(update_fields=["status", "gateway_response", "processed_at"])

    def mark_refunded(self, *, response=None):
        self.status = self.Status.REFUNDED
        if response is not None:
            self.gateway_response = response
        self.processed_at = timezone.now()
        self.save(update_fields=["status", "gateway_response", "processed_at"])

    def __str__(self) -> str:
        return f"{self.gateway}:{self.external_reference or self.idempotency_key} ({self.status})"
