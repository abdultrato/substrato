from apps.payments.models.payment import Payment


def confirm_payment(pagamento: Payment):
    pagamento.confirm()
    return pagamento


confirmar_pagamento = confirm_payment
