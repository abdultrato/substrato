from apps.payments.models.transaction import Transaction
from integrations.payments.mpesa import MpesaGateway
from integrations.payments.registry import get_gateway


def executar(valor, referencia, telefone=None, gateway_nome=None):
    gateway = get_gateway(gateway_nome)

    return gateway.charge(
        amount=valor,
        reference=referencia,
        phone=telefone,
    )


def iniciar_pagamento(fatura, valor):

    referencia = f"FAT-{fatura.id}"

    gateway = MpesaGateway()

    resposta = gateway.iniciar_pagamento(valor, referencia)

    return Transaction.objects.create(
        referencia_externa=referencia,
        gateway=gateway.name,
        status=resposta.get("status", "pendente"),
        resposta_gateway=resposta,
    )
