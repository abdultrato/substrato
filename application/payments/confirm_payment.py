from application.payments.commands import ConfirmPaymentCommand
from application.payments.handlers import handle_confirm_payment
from apps.payments.models.payment import Payment


def confirm_payment(payment: Payment):
    return handle_confirm_payment(
        ConfirmPaymentCommand(
            payment=payment,
            idempotent=True,
        )
    )


__all__ = ["confirm_payment"]
