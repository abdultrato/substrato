from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction


class PaymentSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)

        instancia = self.instance or Payment()
        for campo, valor in attrs.items():
            setattr(instancia, campo, valor)

        if not instancia.inquilino_id:
            req = self.context.get("request") if hasattr(self, "context") else None
            inquilino = getattr(req, "inquilino", None)
            if inquilino is not None:
                instancia.inquilino = inquilino

        try:
            instancia.clean()
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise serializers.ValidationError(exc.message_dict) from exc
            raise serializers.ValidationError(exc.messages) from exc

        return attrs

    def _apply_status_transition(self, instance: Payment, desired_status: str) -> Payment:
        if desired_status == instance.status:
            return instance

        if desired_status == Payment.Status.CONFIRMADO:
            instance.confirm()
            return instance
        if desired_status == Payment.Status.ESTORNADO:
            instance.estornar()
            return instance
        if desired_status == Payment.Status.CANCELADO:
            instance.cancelar()
            return instance
        if desired_status == Payment.Status.FALHOU:
            instance.falhar()
            return instance

        # Voltar para pendente via API não é suportado (evita inconsistências).
        raise serializers.ValidationError({"status": "Transição de status não suportada."})

    def create(self, validated_data):
        # Se vier CONFIRMADO no payload, cria como PENDENTE e confirma via
        # Aggregate Root para atualizar fatura/recibo.
        desired_status = validated_data.get("status") or Payment.Status.PENDENTE
        validated_data["status"] = Payment.Status.PENDENTE

        instance = super().create(validated_data)

        if desired_status != Payment.Status.PENDENTE:
            instance = self._apply_status_transition(instance, desired_status)

        return instance

    def update(self, instance, validated_data):
        desired_status = validated_data.pop("status", None)
        instance = super().update(instance, validated_data)
        if desired_status is not None:
            instance = self._apply_status_transition(instance, desired_status)
        return instance

    class Meta:
        model = Payment
        fields = "__all__"


class ReceiptSerializer(serializers.ModelSerializer):
    fatura_codigo = serializers.CharField(source="fatura.id_custom", read_only=True)
    paciente_nome = serializers.CharField(source="fatura.paciente.nome", read_only=True)
    pagamento_metodo = serializers.CharField(source="pagamento.get_metodo_display", read_only=True)
    pagamento_status = serializers.CharField(source="pagamento.get_status_display", read_only=True)

    class Meta:
        model = Receipt
        fields = "__all__"


class ReconciliationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reconciliation
        fields = "__all__"


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = "__all__"


SERIALIZER_MAP = {
    "pagamento": PaymentSerializer,
    "recibo": ReceiptSerializer,
    "reconciliacao": ReconciliationSerializer,
    "transacao": TransactionSerializer,
}

PagamentoSerializer = PaymentSerializer
ReciboSerializer = ReceiptSerializer
ReconciliacaoSerializer = ReconciliationSerializer
TransacaoSerializer = TransactionSerializer
