from rest_framework import serializers

from aplicativos.pagamentos.modelos.pagamentos import Pagamento
from aplicativos.pagamentos.modelos.recibo import Recibo
from aplicativos.pagamentos.modelos.reconciliacao import Reconciliacao
from aplicativos.pagamentos.modelos.transacao import Transacao

class PagamentoSerializer(serializers.ModelSerializer):
    def _apply_status_transition(self, instance: Pagamento, desired_status: str) -> Pagamento:
        if desired_status == instance.status:
            return instance

        if desired_status == Pagamento.Status.CONFIRMADO:
            instance.confirmar()
            return instance
        if desired_status == Pagamento.Status.ESTORNADO:
            instance.estornar()
            return instance
        if desired_status == Pagamento.Status.CANCELADO:
            instance.cancelar()
            return instance
        if desired_status == Pagamento.Status.FALHOU:
            instance.falhar()
            return instance

        # Voltar para pendente via API não é suportado (evita inconsistências).
        raise serializers.ValidationError({"status": "Transição de status não suportada."})

    def create(self, validated_data):
        # Se vier CONFIRMADO no payload, cria como PENDENTE e confirma via
        # Aggregate Root para atualizar fatura/recibo.
        desired_status = validated_data.get("status") or Pagamento.Status.PENDENTE
        validated_data["status"] = Pagamento.Status.PENDENTE

        instance = super().create(validated_data)

        if desired_status != Pagamento.Status.PENDENTE:
            instance = self._apply_status_transition(instance, desired_status)

        return instance

    def update(self, instance, validated_data):
        desired_status = validated_data.pop("status", None)
        instance = super().update(instance, validated_data)
        if desired_status is not None:
            instance = self._apply_status_transition(instance, desired_status)
        return instance

    class Meta:
        model = Pagamento
        fields = '__all__'

class ReciboSerializer(serializers.ModelSerializer):
    fatura_codigo = serializers.CharField(source="fatura.id_custom", read_only=True)
    paciente_nome = serializers.CharField(source="fatura.paciente.nome", read_only=True)
    pagamento_metodo = serializers.CharField(source="pagamento.get_metodo_display", read_only=True)
    pagamento_status = serializers.CharField(source="pagamento.get_status_display", read_only=True)

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
