from __future__ import annotations

from django.core.exceptions import ValidationError

from application.payments.commands import ConfirmPaymentCommand
from application.payments.handlers import handle_confirm_payment
from apps.billing.models.invoice import Invoice
from apps.payments.models.payment import Payment

from .commands import (
    ConfirmPendingInvoicePaymentCommand,
    IssueInvoiceCommand,
    SyncInvoiceFromOriginCommand,
)


def handle_sync_invoice_from_origin(command: SyncInvoiceFromOriginCommand) -> Invoice:
    invoice = command.invoice

    if command.idempotent and invoice.status != Invoice.Status.DRAFT:
        return invoice

    invoice.sync_items_from_origin()
    invoice.refresh_from_db()
    return invoice


def handle_issue_invoice(command: IssueInvoiceCommand) -> Invoice:
    invoice = command.invoice

    if command.idempotent and invoice.status in {Invoice.Status.ISSUED, Invoice.Status.PAID}:
        return invoice

    invoice.issue()
    invoice.refresh_from_db()
    return invoice


def handle_confirm_pending_invoice_payment(command: ConfirmPendingInvoicePaymentCommand) -> Invoice:
    invoice = command.invoice
    payment = _pending_payment(invoice)

    if payment is None:
        if command.idempotent and invoice.status == Invoice.Status.PAID:
            return invoice
        raise ValidationError("No pending payment to confirm.")

    handle_confirm_payment(
        ConfirmPaymentCommand(
            payment=payment,
            idempotent=False,
        )
    )
    invoice.refresh_from_db()
    return invoice


def _pending_payment(invoice: Invoice) -> Payment | None:
    payments_qs = getattr(invoice, "payments", None)
    if payments_qs is None:
        payments_qs = getattr(invoice, "pagamentos", None)
    if payments_qs is None:
        raise ValidationError("Invoice payments relation not available.")

    return (
        payments_qs.filter(status=Payment.Status.PENDING, deleted=False)
        .order_by("-created_at", "-id")
        .first()
    )
