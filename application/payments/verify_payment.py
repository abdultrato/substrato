def verify_payment(transaction, gateway_name=None):
    from .commands import VerifyPaymentCommand
    from .handlers import handle_verify_payment

    return handle_verify_payment(
        VerifyPaymentCommand(
            transaction=transaction,
            gateway_name=gateway_name,
        )
    )


verificar_pagamento = verify_payment
