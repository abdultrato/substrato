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


def start_payment(fatura, valor):

    referencia = f"FAT-{fatura.id}"

    gateway = MpesaGateway()

    resposta = gateway.charge(valor, referencia)

    return Transaction.objects.create(
        referencia_externa=referencia,
        gateway=gateway.name,
        status=resposta.get("status", "pendente"),
        resposta_gateway=resposta,
    )


executar = execute
iniciar_pagamento = start_payment
