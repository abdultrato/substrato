from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_history import InvoiceHistory
from apps.billing.models.invoice_items import InvoiceItem

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

INVOICE_LEGACY_ALIASES = {
    "cirurgia": "surgery",
    "consulta": "consultation",
    "criado_em": "created_at",
    "estado": "status",
    "id_custom": "custom_id",
    "iva_valor": "vat_amount",
    "origem": "origin",
    "paciente": "patient",
    "procedimento": "procedure",
    "procedimentos": "procedures",
    "requisicao": "request",
    "valor_paciente": "patient_amount",
    "valor_seguro": "insurance_amount",
    "venda": "sale",
}

INVOICE_ITEM_LEGACY_ALIASES = {
    "aplica_iva": "applies_vat",
    "criado_em": "created_at",
    "descricao": "description",
    "exame": "exam",
    "exame_medico": "medical_exam",
    "fatura": "invoice",
    "id_custom": "custom_id",
    "item_venda": "sale_item",
    "iva_percentual": "vat_percentage",
    "iva_valor": "vat_amount",
    "material_procedimento": "procedure_material",
    "preco_unitario": "unit_price",
    "procedimento_item": "procedure_item",
    "procedimento_material": "procedure_material",
    "quantidade": "quantity",
    "tipo_item": "item_type",
}

INVOICE_HISTORY_LEGACY_ALIASES = {
    "criado_em": "created_at",
    "descricao": "description",
    "fatura": "invoice",
    "id_custom": "custom_id",
    "tipo_evento": "event_type",
}


class InvoiceSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INVOICE_LEGACY_ALIASES
    legacy_output_aliases = INVOICE_LEGACY_ALIASES

    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class InvoiceItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INVOICE_ITEM_LEGACY_ALIASES
    legacy_output_aliases = INVOICE_ITEM_LEGACY_ALIASES

    @staticmethod
    def _format_money(value):
        try:
            return str(Decimal(value).quantize(Decimal("0.01")))
        except Exception:
            return None

    def _remove_existing_items(self, *, invoice, item_type, reference):
        if not invoice or not reference:
            return

        reference_field = {
            InvoiceItem.TipoItem.EXAME: "exam",
            InvoiceItem.TipoItem.EXAME_MEDICO: "medical_exam",
            InvoiceItem.TipoItem.ITEM_VENDA: "sale_item",
            InvoiceItem.TipoItem.PROCEDIMENTO_ITEM: "procedure_item",
            InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL: "procedure_material",
        }.get(item_type)

        if not reference_field:
            return

        queryset = InvoiceItem.objects.filter(
            invoice=invoice,
            deleted=False,
            **{reference_field: reference},
        )

        if getattr(self, "instance", None) is not None:
            queryset = queryset.exclude(pk=self.instance.pk)

        for item in queryset:
            item.delete()

    def create(self, validated_date):
        invoice = validated_date.get("invoice")
        item_type = validated_date.get("item_type", InvoiceItem.TipoItem.EXAME)
        reference = {
            InvoiceItem.TipoItem.EXAME: validated_date.get("exam"),
            InvoiceItem.TipoItem.EXAME_MEDICO: validated_date.get("medical_exam"),
            InvoiceItem.TipoItem.ITEM_VENDA: validated_date.get("sale_item"),
            InvoiceItem.TipoItem.PROCEDIMENTO_ITEM: validated_date.get("procedure_item"),
            InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL: validated_date.get("procedure_material"),
        }.get(item_type)

        with transaction.atomic():
            self._remove_existing_items(
                invoice=invoice,
                item_type=item_type,
                reference=reference,
            )

            return super().create(validated_date)

    def update(self, instance, validated_date):
        item_type = validated_date.get("item_type", instance.item_type)
        reference = {
            InvoiceItem.TipoItem.EXAME: validated_date.get("exam", instance.exam),
            InvoiceItem.TipoItem.EXAME_MEDICO: validated_date.get("medical_exam", instance.medical_exam),
            InvoiceItem.TipoItem.ITEM_VENDA: validated_date.get("sale_item", instance.sale_item),
            InvoiceItem.TipoItem.PROCEDIMENTO_ITEM: validated_date.get(
                "procedure_item", instance.procedure_item
            ),
            InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL: validated_date.get(
                "procedure_material", instance.procedure_material
            ),
        }.get(item_type)

        with transaction.atomic():
            self._remove_existing_items(
                invoice=validated_date.get("invoice", instance.invoice),
                item_type=item_type,
                reference=reference,
            )

            return super().update(instance, validated_date)

    total_sem_iva = serializers.SerializerMethodField(method_name="get_total_before_tax")
    vat_amount = serializers.SerializerMethodField(method_name="get_tax_amount")
    total_com_iva = serializers.SerializerMethodField(method_name="get_total_with_tax")

    def get_total_before_tax(self, obj):
        return self._format_money(getattr(obj, "total_sem_iva", None))

    def get_tax_amount(self, obj):
        return self._format_money(getattr(obj, "vat_amount", None))

    def get_total_with_tax(self, obj):
        return self._format_money(getattr(obj, "total_com_iva", None))

    class Meta:
        model = InvoiceItem
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        validators: list = []  # evita UniqueValidators automáticos que usam campo deleted


class InvoiceHistorySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INVOICE_HISTORY_LEGACY_ALIASES
    legacy_output_aliases = INVOICE_HISTORY_LEGACY_ALIASES

    class Meta:
        model = InvoiceHistory
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


SERIALIZER_MAP = {
    "invoice": InvoiceSerializer,
    "faturaitem": InvoiceItemSerializer,
    "historicofatura": InvoiceHistorySerializer,
}
