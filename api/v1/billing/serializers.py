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


class FaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class FaturaItemSerializer(serializers.ModelSerializer):
    def _remove_itens_preexistentes(self, *, fatura, tipo_item, referencia):
        if not fatura or not referencia:
            return

        campo_ref = {
            InvoiceItem.TipoItem.EXAME: "exame",
            InvoiceItem.TipoItem.EXAME_MEDICO: "exame_medico",
            InvoiceItem.TipoItem.ITEM_VENDA: "item_venda",
            InvoiceItem.TipoItem.PROCEDIMENTO_ITEM: "procedimento_item",
            InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL: "procedimento_material",
        }.get(tipo_item)

        if not campo_ref:
            return

        qs = InvoiceItem.objects.filter(
            fatura=fatura,
            deletado=False,
            **{campo_ref: referencia},
        )

        if getattr(self, "instance", None) is not None:
            qs = qs.exclude(pk=self.instance.pk)

        for item in qs:
            item.delete()

    def create(self, validated_data):
        fatura = validated_data.get("fatura")
        tipo_item = validated_data.get("tipo_item", InvoiceItem.TipoItem.EXAME)
        referencia = {
            InvoiceItem.TipoItem.EXAME: validated_data.get("exame"),
            InvoiceItem.TipoItem.EXAME_MEDICO: validated_data.get("exame_medico"),
            InvoiceItem.TipoItem.ITEM_VENDA: validated_data.get("item_venda"),
            InvoiceItem.TipoItem.PROCEDIMENTO_ITEM: validated_data.get("procedimento_item"),
            InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL: validated_data.get("procedimento_material"),
        }.get(tipo_item)

        with transaction.atomic():
            self._remove_itens_preexistentes(
                fatura=fatura,
                tipo_item=tipo_item,
                referencia=referencia,
            )

            return super().create(validated_data)

    def update(self, instance, validated_data):
        tipo_item = validated_data.get("tipo_item", instance.tipo_item)
        referencia = {
            InvoiceItem.TipoItem.EXAME: validated_data.get("exame", instance.exame),
            InvoiceItem.TipoItem.EXAME_MEDICO: validated_data.get("exame_medico", instance.exame_medico),
            InvoiceItem.TipoItem.ITEM_VENDA: validated_data.get("item_venda", instance.item_venda),
            InvoiceItem.TipoItem.PROCEDIMENTO_ITEM: validated_data.get(
                "procedimento_item", instance.procedimento_item
            ),
            InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL: validated_data.get(
                "procedimento_material", instance.procedimento_material
            ),
        }.get(tipo_item)

        with transaction.atomic():
            self._remove_itens_preexistentes(
                fatura=validated_data.get("fatura", instance.fatura),
                tipo_item=tipo_item,
                referencia=referencia,
            )

            return super().update(instance, validated_data)

    total_sem_iva = serializers.SerializerMethodField()
    iva_valor = serializers.SerializerMethodField()
    total_com_iva = serializers.SerializerMethodField()

    def get_total_sem_iva(self, obj):
        try:
            return str(obj.total_sem_iva)
        except Exception:
            return None

    def get_iva_valor(self, obj):
        try:
            return str(obj.iva_valor)
        except Exception:
            return None

    def get_total_com_iva(self, obj):
        try:
            return str(obj.total_com_iva)
        except Exception:
            return None

    class Meta:
        model = InvoiceItem
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class HistoricoFaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceHistory
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


SERIALIZER_MAP = {
    "fatura": FaturaSerializer,
    "faturaitem": FaturaItemSerializer,
    "historicofatura": HistoricoFaturaSerializer,
}
