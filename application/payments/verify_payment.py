def verify_payment(transaction, gateway_name=None):
    from integrations.payments.registry import get_gateway

    gateway = get_gateway(gateway_name or transaction.gateway)
    return gateway.status(transaction.external_reference)


verificar_pagamento = verify_payment
