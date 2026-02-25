from .modelos.pagamento import Pagamento
from .modelos.transacao import Transacao
from .gateways.mpesa import MpesaGateway

class ServicoPagamento:

    def iniciar_pagamento(self, fatura, valor):
        referencia = f"FAT-{fatura.id}"

        gateway = MpesaGateway()
        resposta = gateway.iniciar_pagamento(valor, referencia)

        transacao = Transacao.objects.create(
            referencia_externa=referencia,
            gateway="mpesa",
            status="pendente"
        )

        return transacao

    def confirmar_pagamento(self, pagamento):
        pagamento.confirmado = True
        pagamento.save()
