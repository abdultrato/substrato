from rest_framework import serializers

from aplicativos.pagamentos.modelos.pagamentos import Pagamento
from aplicativos.pagamentos.modelos.recibo import Recibo
from aplicativos.pagamentos.modelos.reconciliacao import Reconciliacao
from aplicativos.pagamentos.modelos.transacao import Transacao

class PagamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagamento
        fields = '__all__'

class ReciboSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recibo
        fields = '__all__'

class ReconciliacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reconciliacao
        fields = '__all__'

class TransacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transacao
        fields = '__all__'

SERIALIZER_MAP = {
    'pagamento': PagamentoSerializer,
    'recibo': ReciboSerializer,
    'reconciliacao': ReconciliacaoSerializer,
    'transacao': TransacaoSerializer,
}
