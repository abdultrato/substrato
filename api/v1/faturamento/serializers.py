from django.db import transaction
from rest_framework import serializers

from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.fatura_itens import FaturaItem
from aplicativos.faturamento.modelos.historico_fatura import HistoricoFatura

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
        model = Fatura
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class FaturaItemSerializer(serializers.ModelSerializer):
    def _remove_itens_preexistentes(self, *, fatura, tipo_item, referencia):
        if not fatura or not referencia:
            return

        campo_ref = {
            FaturaItem.TipoItem.EXAME: "exame",
            FaturaItem.TipoItem.EXAME_MEDICO: "exame_medico",
            FaturaItem.TipoItem.ITEM_VENDA: "item_venda",
            FaturaItem.TipoItem.PROCEDIMENTO_ITEM: "procedimento_item",
            FaturaItem.TipoItem.PROCEDIMENTO_MATERIAL: "procedimento_material",
        }.get(tipo_item)

        if not campo_ref:
            return

        qs = FaturaItem.objects.filter(
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
        tipo_item = validated_data.get("tipo_item", FaturaItem.TipoItem.EXAME)
        referencia = {
            FaturaItem.TipoItem.EXAME: validated_data.get("exame"),
            FaturaItem.TipoItem.EXAME_MEDICO: validated_data.get("exame_medico"),
            FaturaItem.TipoItem.ITEM_VENDA: validated_data.get("item_venda"),
            FaturaItem.TipoItem.PROCEDIMENTO_ITEM: validated_data.get("procedimento_item"),
            FaturaItem.TipoItem.PROCEDIMENTO_MATERIAL: validated_data.get("procedimento_material"),
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
            FaturaItem.TipoItem.EXAME: validated_data.get("exame", instance.exame),
            FaturaItem.TipoItem.EXAME_MEDICO: validated_data.get("exame_medico", instance.exame_medico),
            FaturaItem.TipoItem.ITEM_VENDA: validated_data.get("item_venda", instance.item_venda),
            FaturaItem.TipoItem.PROCEDIMENTO_ITEM: validated_data.get(
                "procedimento_item", instance.procedimento_item
            ),
            FaturaItem.TipoItem.PROCEDIMENTO_MATERIAL: validated_data.get(
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
        model = FaturaItem
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class HistoricoFaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricoFatura
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


SERIALIZER_MAP = {
    "fatura": FaturaSerializer,
    "faturaitem": FaturaItemSerializer,
    "historicofatura": HistoricoFaturaSerializer,
}
