from __future__ import annotations

from dataclasses import dataclass

from apps.billing.models.invoice import Invoice


@dataclass(frozen=True, slots=True)
class SyncInvoiceFromOriginCommand:
    invoice: Invoice
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class IssueInvoiceCommand:
    invoice: Invoice
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class ConfirmPendingInvoicePaymentCommand:
    invoice: Invoice
    idempotent: bool = True

