from apps.payments.models.transaction import Transaction
from integrations.payments.mpesa import MpesaGateway
from integrations.payments.registry import get_gateway


def execute(value, reference, phone=None, gateway_name=None):
    gateway = get_gateway(gateway_name)

    return gateway.charge(
        amount=value,
        reference=reference,
        phone=phone,
    )


def start_payment(invoice, value):

    referencia = f"FAT-{invoice.id}"

    gateway = MpesaGateway()

    response = gateway.charge(value, referencia)

    return Transaction.objects.create(
        external_reference=referencia,
        gateway=gateway.name,
        status=response.get("status", "pendente"),
        gateway_response=response,
    )


executar = execute
iniciar_payment = start_payment
