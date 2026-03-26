def refund_payment(payment):
    payment.refund()
    return payment


estornar_pagamento = refund_payment
