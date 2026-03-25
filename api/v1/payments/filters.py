from api.core.filters import SafeFilterSet
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction

# =====================================================
# PAYMENTS
# =====================================================


class PaymentFilter(SafeFilterSet):
    class Meta:
        model = Payment
        fields = [
            "tenant",
            "custom_id",
            "description",
            "name",
            "order",
            "active",
            "deleted",
            "deleted_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "invoice",
            "value",
            "method",
            "status",
            "external_reference",
            "insurer",
            "coverage_plan",
            "authorization_number",
            "paid_at",
        ]


# =====================================================
# RECEIPTS
# =====================================================


class ReceiptFilter(SafeFilterSet):
    class Meta:
        model = Receipt
        fields = [
            "invoice",
            "payment",
            "number",
            "value",
            "created_at",
        ]


# =====================================================
# RECONCILIATIONS
# =====================================================


class ReconciliationFilter(SafeFilterSet):
    class Meta:
        model = Reconciliation
        fields = [
            "transaction",
            "confirmed",
            "confirmation_date",
            "created_at",
        ]


# =====================================================
# TRANSACTIONS
# =====================================================


class TransactionFilter(SafeFilterSet):
    class Meta:
        model = Transaction
        fields = [
            "external_reference",
            "gateway",
            "status",
            "created_at",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "payment": PaymentFilter,
    "recibo": ReceiptFilter,
    "reconciliacao": ReconciliationFilter,
    "transaction": TransactionFilter,
}

