from api.core.filters import SafeFilterSet
from apps.cotacoes.models import (
    ProformaHistory,
    ProformaInvoice,
    ProformaItem,
    Quotation,
    QuotationItem,
    QuotationStatusHistory,
)


class QuotationFilter(SafeFilterSet):
    class Meta:
        model = Quotation
        fields = [
            "tenant",
            "custom_id",
            "quotation_number",
            "status",
            "fiscal_client",
            "patient",
            "issue_date",
            "expiry_date",
            "created_at",
        ]


class QuotationItemFilter(SafeFilterSet):
    class Meta:
        model = QuotationItem
        fields = ["tenant", "custom_id", "quotation", "item_type", "description"]


class QuotationStatusHistoryFilter(SafeFilterSet):
    class Meta:
        model = QuotationStatusHistory
        fields = ["tenant", "quotation", "event_type", "event_at"]


class ProformaInvoiceFilter(SafeFilterSet):
    class Meta:
        model = ProformaInvoice
        fields = [
            "tenant",
            "custom_id",
            "proforma_number",
            "status",
            "quotation",
            "fiscal_client",
            "patient",
            "issue_date",
            "expiry_date",
            "created_at",
        ]


class ProformaItemFilter(SafeFilterSet):
    class Meta:
        model = ProformaItem
        fields = ["tenant", "custom_id", "proforma", "item_type", "description"]


class ProformaHistoryFilter(SafeFilterSet):
    class Meta:
        model = ProformaHistory
        fields = ["tenant", "proforma", "event_type", "event_at"]
