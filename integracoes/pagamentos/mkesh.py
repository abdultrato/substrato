from .base import GatewayPagamento

class MpesaGateway(GatewayPagamento):

    def iniciar_pagamento(self, valor, referencia):
        return {"status": "enviado"}

    def verificar_status(self, referencia):
        return {"status": "confirmado"}
