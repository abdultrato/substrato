from apps.payments.models.payment import Payment


def confirm_payment(payment: Payment):
    payment.confirm()
    return payment


confirmar_payment = confirm_payment
