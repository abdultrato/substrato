"""FilterSets para recursos de Pagamentos na API v1."""

from api.core.filters import SafeFilterSet
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction

# =====================================================
# PAYMENTS
# =====================================================


class PaymentFilter(SafeFilterSet):
    legacy_filter_aliases = {
        "estado": "status",
        "fatura": "invoice",
        "metodo": "method",
        "numero_autorizacao": "authorization_number",
        "plano_cobertura": "coverage_plan",
        "seguradora": "insurer",
        "valor": "value",
    }

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
    legacy_filter_aliases = {
        "fatura": "invoice",
        "numero": "number",
        "pagamento": "payment",
        "valor": "value",
    }

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
    legacy_filter_aliases = {
        "confirmado": "confirmed",
        "data_confirmacao": "confirmation_date",
        "transacao": "transaction",
    }

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
    legacy_filter_aliases = {
        "referencia_externa": "external_reference",
        "resposta_gateway": "gateway_response",
        "transacao": "external_reference",
    }

    class Meta:
        model = Transaction
        fields = [
            "gateway_response",
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

