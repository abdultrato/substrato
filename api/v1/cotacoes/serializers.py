from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.cotacoes.models import (
    ProformaHistory,
    ProformaInvoice,
    ProformaItem,
    Quotation,
    QuotationItem,
    QuotationStatusHistory,
)

CORE_READ_ONLY_FIELDS = [
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
]

# Totais e datas de ciclo de vida são derivados pelos serviços, nunca enviados pelo cliente.
DOCUMENT_READ_ONLY_FIELDS = CORE_READ_ONLY_FIELDS + [
    "subtotal",
    "discount_total",
    "tax_total",
    "grand_total",
    "deposit_required",
    "balance_due",
    "sent_at",
    "accepted_at",
    "rejected_at",
    "converted_at",
]


class QuotationItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + ["discount_amount", "tax_amount", "line_total"]


class QuotationStatusHistorySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = QuotationStatusHistory
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class QuotationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True, read_only=True)

    class Meta:
        model = Quotation
        fields = "__all__"
        read_only_fields = DOCUMENT_READ_ONLY_FIELDS + ["quotation_number", "status", "converted_proforma"]


class ProformaItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = ProformaItem
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + ["discount_amount", "tax_amount", "line_total"]


class ProformaHistorySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = ProformaHistory
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class ProformaInvoiceSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    items = ProformaItemSerializer(many=True, read_only=True)

    class Meta:
        model = ProformaInvoice
        fields = "__all__"
        read_only_fields = DOCUMENT_READ_ONLY_FIELDS + [
            "proforma_number",
            "status",
            "quotation",
            "converted_invoice",
        ]
