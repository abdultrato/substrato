from apps.payments.models.transaction import Transaction
from integrations.payments.registry import get_gateway


def execute(value, reference, phone=None, gateway_name=None):
    gateway = get_gateway(gateway_name)

    return gateway.charge(
        amount=value,
        reference=reference,
        phone=phone,
    )


def start_payment(invoice, value, phone=None, gateway_name=None):
    reference = f"FAT-{invoice.id}"
    gateway = get_gateway(gateway_name)

    if gateway.name in {"mpesa", "emola", "mkesh"} and not phone:
        raise ValueError("Telefone é obrigatório para pagamentos Mobile Money.")

    response = gateway.charge(value, reference, phone=phone)

    return Transaction.objects.create(
        external_reference=reference,
        gateway=gateway.name,
        status=response.get("status", "pendente"),
        gateway_response=response,
    )
