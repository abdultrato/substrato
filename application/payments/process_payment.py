from application.payments.start_payment import start_payment


def process_payment(invoice, value, phone=None, gateway_name=None):
    return start_payment(invoice, value, phone=phone, gateway_name=gateway_name)


processar_pagamento = process_payment
