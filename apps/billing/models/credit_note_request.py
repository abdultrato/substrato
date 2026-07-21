"""Pedido de nota de crédito sobre uma fatura — fluxo aprovado pela Contabilidade.

Uma nota de crédito anula (total ou parcialmente) uma fatura já emitida. Como a
emissão da fatura original da consulta significa que o serviço foi pago, qualquer
correção/estorno passa a exigir uma nota de crédito, que **só a Contabilidade**
pode aprovar ou rejeitar. O pedido fica numa fila para esse sector tratar.
"""

from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField


class CreditNoteRequest(NoNameCoreModel):
    """Pedido de nota de crédito associado a uma fatura (e, opcionalmente, consulta)."""

    prefix = "NC"  # Prefixo para IDs amigáveis (ex.: NC-...)

    class Status(models.TextChoices):
        PENDING = "PEND", "Pendente"
        APPROVED = "APRO", "Aprovada"
        REJECTED = "REJE", "Rejeitada"
        CANCELED = "CANC", "Cancelada"

    invoice = models.ForeignKey(
        "faturamento.Invoice",
        db_column="invoice_id",
        verbose_name="Fatura",
        on_delete=models.PROTECT,
        related_name="credit_note_requests",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "consultas.MedicalConsultation",
        db_column="consultation_id",
        verbose_name="Consulta",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_note_requests",
        db_index=True,
    )
    patient = models.ForeignKey(
        "clinical.Patient",
        db_column="patient_id",
        verbose_name="Paciente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_note_requests",
    )
    sale_item = models.ForeignKey(
        "farmacia.SaleItem",
        db_column="sale_item_id",
        verbose_name="Item de venda",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_note_requests",
        db_index=True,
        help_text="Item específico da venda a estornar; nulo quando o pedido é sobre a fatura inteira.",
    )

    amount = MoneyField("Valor solicitado", db_column="amount", default=Decimal("0.00"))
    reason = models.TextField("Motivo", db_column="reason", blank=True, default="")

    status = models.CharField(
        "Estado",
        db_column="status",
        max_length=4,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        db_column="reviewed_by_id",
        verbose_name="Revisto por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_note_requests_reviewed",
    )
    reviewed_at = models.DateTimeField("Revisto em", db_column="reviewed_at", null=True, blank=True)
    decision_note = models.TextField("Nota da decisão", db_column="decision_note", blank=True, default="")

    class Meta:
        db_table = "faturamento_pedidonotacredito"
        verbose_name = "Pedido de Nota de Crédito"
        verbose_name_plural = "Pedidos de Nota de Crédito"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "created_at"]),
            models.Index(fields=["tenant", "invoice"]),
        ]

    def clean(self):
        super().clean()
        if self.invoice_id and self.tenant_id and self.invoice.tenant_id != self.tenant_id:
            raise ValidationError({"invoice": "Fatura e pedido devem pertencer ao mesmo tenant."})
        if self.sale_item_id and self.tenant_id and self.sale_item.tenant_id != self.tenant_id:
            raise ValidationError({"sale_item": "Item de venda e pedido devem pertencer ao mesmo tenant."})
        if self.amount is None or self.amount < Decimal("0.00"):
            raise ValidationError({"amount": "Valor inválido."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.invoice_id:
            self.tenant_id = self.invoice.tenant_id
        if not self.patient_id and self.invoice_id:
            self.patient_id = self.invoice.patient_id
        if (self.amount is None or self.amount == Decimal("0.00")) and not self.pk:
            # Valor por defeito: total do item (se for pedido por item) ou da fatura.
            if self.sale_item_id:
                item = self.sale_item
                self.amount = (item.quantity or 0) * (item.unit_price or Decimal("0.00"))
            elif self.invoice_id:
                self.amount = self.invoice.total or Decimal("0.00")
        self.full_clean()
        return super().save(*args, **kwargs)

    # ── Transições (Contabilidade) ────────────────────────────────────────────

    def _ensure_pending(self):
        if self.status != self.Status.PENDING:
            raise ValidationError("Apenas pedidos pendentes podem ser decididos.")

    def approve(self, *, user=None, note: str = ""):
        """Aprova o pedido (Contabilidade). Regista a decisão; a emissão fiscal da
        nota de crédito / lançamento contabilístico fica a cargo da Contabilidade."""
        self._ensure_pending()
        self.status = self.Status.APPROVED
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.decision_note = note or ""
        self.save(update_fields=["status", "reviewed_by", "reviewed_at", "decision_note", "updated_at"])
        return self

    def reject(self, *, user=None, note: str = ""):
        """Rejeita o pedido (Contabilidade)."""
        self._ensure_pending()
        self.status = self.Status.REJECTED
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.decision_note = note or ""
        self.save(update_fields=["status", "reviewed_by", "reviewed_at", "decision_note", "updated_at"])
        return self

    def cancel(self, *, user=None, note: str = ""):
        """Cancela o pedido (quem solicitou, antes de decisão da Contabilidade)."""
        self._ensure_pending()
        self.status = self.Status.CANCELED
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.decision_note = note or ""
        self.save(update_fields=["status", "reviewed_by", "reviewed_at", "decision_note", "updated_at"])
        return self

    def __str__(self) -> str:
        return f"{self.custom_id} - {getattr(self.invoice, 'custom_id', self.invoice_id)} ({self.get_status_display()})"
