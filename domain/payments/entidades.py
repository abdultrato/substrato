"""Aliases de entidades de pagamento (interop domínio <-> models Django)."""

from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction

Pagamento = Payment
Recibo = Receipt
Conciliacao = Reconciliation
Transacao = Transaction

__all__ = [
    "Conciliacao",
    "Pagamento",
    "Payment",
    "Receipt",
    "Recibo",
    "Reconciliation",
    "Transacao",
    "Transaction",
]
