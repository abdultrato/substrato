def refund_payment(payment):
    from .commands import RefundPaymentCommand
    from .handlers import handle_refund_payment

    return handle_refund_payment(
        RefundPaymentCommand(
            payment=payment,
            idempotent=True,
        )
    )


estornar_pagamento = refund_payment
