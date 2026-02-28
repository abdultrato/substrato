from rest_framework import serializers

from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.fatura_itens import FaturaItem
from aplicativos.faturamento.modelos.historico_fatura import HistoricoFatura

class FaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fatura
        fields = '__all__'

class FaturaItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaturaItem
        fields = '__all__'

class HistoricoFaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricoFatura
        fields = '__all__'

SERIALIZER_MAP = {
    'fatura': FaturaSerializer,
    'faturaitem': FaturaItemSerializer,
    'historicofatura': HistoricoFaturaSerializer,
}
