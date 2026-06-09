from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from apps.payments.models.payment import Payment
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction


@dataclass(frozen=True, slots=True)
class StartPaymentCommand:
    invoice: Any
    value: Decimal | str
    phone: str | None = None
    gateway_name: str | None = None
    reference: str | None = None
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class VerifyPaymentCommand:
    transaction: Transaction
    gateway_name: str | None = None


@dataclass(frozen=True, slots=True)
class ReconcileTransactionCommand:
    transaction: Transaction
    gateway_name: str | None = None
    confirm_when_paid: bool = True
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class ConfirmPaymentCommand:
    payment: Payment
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class RefundPaymentCommand:
    payment: Payment
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class CancelPaymentCommand:
    payment: Payment
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class FailPaymentCommand:
    payment: Payment
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class ConfirmReconciliationCommand:
    reconciliation: Reconciliation
    idempotent: bool = True
