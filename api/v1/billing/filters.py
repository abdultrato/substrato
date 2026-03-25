from api.core.filters import SafeFilterSet
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_history import InvoiceHistory
from apps.billing.models.invoice_items import InvoiceItem

# =====================================================
# FATURA
# =====================================================


class InvoiceFilter(SafeFilterSet):
    legacy_filter_aliases = {
        "estado": "status",
        "fatura": "custom_id",
        "id_custom": "custom_id",
        "iva_valor": "vat_amount",
        "origem": "origin",
        "paciente": "patient",
        "valor_paciente": "patient_amount",
        "valor_seguro": "insurance_amount",
    }

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
            "origin",
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
    legacy_filter_aliases = {
        "aplica_iva": "applies_vat",
        "descricao": "description",
        "fatura": "invoice",
        "id_custom": "custom_id",
        "iva_percentual": "vat_percentage",
        "preco_unitario": "unit_price",
        "quantidade": "quantity",
        "tipo_item": "item_type",
    }

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
            "applies_vat",
            "vat_percentage",
            "item_type",
        ]


# =====================================================
# HISTÓRICO FATURA
# =====================================================


class InvoiceHistoryFilter(SafeFilterSet):
    legacy_filter_aliases = {
        "fatura": "invoice",
    }

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
