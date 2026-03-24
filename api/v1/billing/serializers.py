from django.db import transaction
from rest_framework import serializers

from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.billing.models.invoice_history import InvoiceHistory

CORE_READ_ONLY_FIELDS = [
    "id",
    "id_custom",
    "inquilino",
    "criado_por",
    "atualizado_por",
    "criado_em",
    "atualizado_em",
    "deletado",
    "deletado_em",
    "deletado_por",
    "versao",
]


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class InvoiceItemSerializer(serializers.ModelSerializer):
    def _remove_existing_items(self, *, invoice, item_type, reference):
        if not invoice or not reference:
            return

        reference_field = {
            InvoiceItem.TipoItem.EXAME: "exame",
            InvoiceItem.TipoItem.EXAME_MEDICO: "exame_medico",
            InvoiceItem.TipoItem.ITEM_VENDA: "item_venda",
            InvoiceItem.TipoItem.PROCEDIMENTO_ITEM: "procedimento_item",
            InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL: "procedimento_material",
        }.get(item_type)

        if not reference_field:
            return

        queryset = InvoiceItem.objects.filter(
            fatura=invoice,
            deletado=False,
            **{reference_field: reference},
        )

        if getattr(self, "instance", None) is not None:
            queryset = queryset.exclude(pk=self.instance.pk)

        for item in queryset:
            item.delete()

    def create(self, validated_data):
        invoice = validated_data.get("fatura")
        item_type = validated_data.get("tipo_item", InvoiceItem.TipoItem.EXAME)
        reference = {
            InvoiceItem.TipoItem.EXAME: validated_data.get("exame"),
            InvoiceItem.TipoItem.EXAME_MEDICO: validated_data.get("exame_medico"),
            InvoiceItem.TipoItem.ITEM_VENDA: validated_data.get("item_venda"),
            InvoiceItem.TipoItem.PROCEDIMENTO_ITEM: validated_data.get("procedimento_item"),
            InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL: validated_data.get("procedimento_material"),
        }.get(item_type)

        with transaction.atomic():
            self._remove_existing_items(
                invoice=invoice,
                item_type=item_type,
                reference=reference,
            )

            return super().create(validated_data)

    def update(self, instance, validated_data):
        item_type = validated_data.get("tipo_item", instance.tipo_item)
        reference = {
            InvoiceItem.TipoItem.EXAME: validated_data.get("exame", instance.exame),
            InvoiceItem.TipoItem.EXAME_MEDICO: validated_data.get("exame_medico", instance.exame_medico),
            InvoiceItem.TipoItem.ITEM_VENDA: validated_data.get("item_venda", instance.item_venda),
            InvoiceItem.TipoItem.PROCEDIMENTO_ITEM: validated_data.get(
                "procedimento_item", instance.procedimento_item
            ),
            InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL: validated_data.get(
                "procedimento_material", instance.procedimento_material
            ),
        }.get(item_type)

        with transaction.atomic():
            self._remove_existing_items(
                invoice=validated_data.get("fatura", instance.fatura),
                item_type=item_type,
                reference=reference,
            )

            return super().update(instance, validated_data)

    total_sem_iva = serializers.SerializerMethodField(method_name="get_total_before_tax")
    iva_valor = serializers.SerializerMethodField(method_name="get_tax_amount")
    total_com_iva = serializers.SerializerMethodField(method_name="get_total_with_tax")

    def get_total_before_tax(self, obj):
        try:
            return str(obj.total_sem_iva)
        except Exception:
            return None

    def get_tax_amount(self, obj):
        try:
            return str(obj.iva_valor)
        except Exception:
            return None

    def get_total_with_tax(self, obj):
        try:
            return str(obj.total_com_iva)
        except Exception:
            return None

    class Meta:
        model = InvoiceItem
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class InvoiceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceHistory
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


SERIALIZER_MAP = {
    "fatura": InvoiceSerializer,
    "faturaitem": InvoiceItemSerializer,
    "historicofatura": InvoiceHistorySerializer,
}
