from rest_framework import serializers

from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.fatura_itens import FaturaItem
from aplicativos.faturamento.modelos.historico_fatura import HistoricoFatura


class FaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fatura
        fields = "__all__"


class FaturaItemSerializer(serializers.ModelSerializer):
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


class HistoricoFaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricoFatura
        fields = "__all__"


SERIALIZER_MAP = {
    "fatura": FaturaSerializer,
    "faturaitem": FaturaItemSerializer,
    "historicofatura": HistoricoFaturaSerializer,
}
