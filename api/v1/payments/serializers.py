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
        for campo, value in attrs.items():
            setattr(instancia, campo, value)

        if not instancia.tenant_id:
            req = self.context.get("request") if hasattr(self, "context") else None
            tenant = getattr(req, "tenant", None)
            if tenant is not None:
                instancia.tenant = tenant

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

        if desired_status == Payment.Status.CONFIRMED:
            instance.confirm()
            return instance
        if desired_status == Payment.Status.REFUNDED:
            instance.refund()
            return instance
        if desired_status == Payment.Status.CANCELED:
            instance.cancel()
            return instance
        if desired_status == Payment.Status.FAILED:
            instance.fail()
            return instance

        # Voltar para pendente via API não é suportado (evita inconsistências).
        raise serializers.ValidationError({"status": "Transição de status não suportada."})

    def create(self, validated_date):
        # Se vier CONFIRMADO no payload, cria como PENDENTE e confirma via
        # Aggregate Root para atualizar invoice/recibo.
        desired_status = validated_date.get("status") or Payment.Status.PENDING
        validated_date["status"] = Payment.Status.PENDING

        instance = super().create(validated_date)

        if desired_status != Payment.Status.PENDING:
            instance = self._apply_status_transition(instance, desired_status)

        return instance

    def update(self, instance, validated_date):
        desired_status = validated_date.pop("status", None)
        instance = super().update(instance, validated_date)
        if desired_status is not None:
            instance = self._apply_status_transition(instance, desired_status)
        return instance

    class Meta:
        model = Payment
        fields = "__all__"


class ReceiptSerializer(serializers.ModelSerializer):
    invoice_code = serializers.CharField(source="invoice.custom_id", read_only=True)
    patient_name = serializers.CharField(source="invoice.patient.name", read_only=True)
    payment_method = serializers.CharField(source="payment.get_method_display", read_only=True)
    payment_status = serializers.CharField(source="payment.get_status_display", read_only=True)

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
    "payment": PaymentSerializer,
    "receipt": ReceiptSerializer,
    "reconciliation": ReconciliationSerializer,
    "transaction": TransactionSerializer,
    "recibo": ReceiptSerializer,
    "reconciliacao": ReconciliationSerializer,
}
