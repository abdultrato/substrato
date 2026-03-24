import uuid

from apps.payments.models.pagamento import Payment
from apps.payments.models.receipt import Receipt


def confirm_payment(pagamento: Payment):

    pagamento.confirmado = True
    pagamento.save(update_fields=["confirmado"])

    Receipt.objects.create(
        fatura=pagamento.fatura,
        pagamento=pagamento,
        numero=str(uuid.uuid4()),
        valor=pagamento.valor,
    )

    return pagamento


confirmar_pagamento = confirm_payment
