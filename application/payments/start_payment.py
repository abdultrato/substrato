from integrations.payments.registry import get_gateway

from .commands import StartPaymentCommand
from .handlers import handle_start_payment


def execute(value, reference, phone=None, gateway_name=None):
    gateway = get_gateway(gateway_name)

    return gateway.charge(
        amount=value,
        reference=reference,
        phone=phone,
    )


def start_payment(invoice, value, phone=None, gateway_name=None):
    return handle_start_payment(
        StartPaymentCommand(
            invoice=invoice,
            value=value,
            phone=phone,
            gateway_name=gateway_name,
            idempotent=True,
        )
    )
