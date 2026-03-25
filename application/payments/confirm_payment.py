from apps.payments.models.payment import Payment


def confirm_payment(payment: Payment):
    payment.confirm()
    return payment


__all__ = ["confirm_payment"]
