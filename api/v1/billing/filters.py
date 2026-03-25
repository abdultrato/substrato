from api.core.filters import SafeFilterSet
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_history import InvoiceHistory
from apps.billing.models.invoice_items import InvoiceItem

# =====================================================
# FATURA
# =====================================================


class InvoiceFilter(SafeFilterSet):
    class Meta:
        model = Invoice
        fields = [
            "tenant",
            "custom_id",
            "description",
            "order",
            "active",
            "deleted",
            "deleted_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "request",
            "surgery",
            "patient",
            "subtotal",
            "vat_amount",
            "total",
            "insurance_amount",
            "patient_amount",
            "status",
        ]


# =====================================================
# FATURA ITEM
# =====================================================


class InvoiceItemFilter(SafeFilterSet):
    class Meta:
        model = InvoiceItem
        fields = [
            "tenant",
            "custom_id",
            "order",
            "active",
            "deleted",
            "deleted_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "invoice",
            "exam",
            "description",
            "quantity",
            "unit_price",
        ]


# =====================================================
# HISTÓRICO FATURA
# =====================================================


class InvoiceHistoryFilter(SafeFilterSet):
    class Meta:
        model = InvoiceHistory
        fields = [
            "invoice",
            "description",
            "event_type",
            "created_at",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "invoice": InvoiceFilter,
    "faturaitem": InvoiceItemFilter,
    "historicofatura": InvoiceHistoryFilter,
}
