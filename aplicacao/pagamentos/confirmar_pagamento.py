import uuid

from aplicativos.pagamentos.modelos.pagamento import Pagamento
from aplicativos.pagamentos.modelos.recibo import Recibo


def confirmar_pagamento(pagamento: Pagamento):

    pagamento.confirmado = True
    pagamento.save(update_fields=["confirmado"])

    Recibo.objects.create(
        fatura=pagamento.fatura,
        pagamento=pagamento,
        numero=str(uuid.uuid4()),
        valor=pagamento.valor,
    )

    return pagamento
