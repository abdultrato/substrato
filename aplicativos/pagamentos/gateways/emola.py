from .base_gateway import GatewayBase


class EmolaGateway(GatewayBase):

    def iniciar_pagamento(self, valor, referencia):
        return {"status": "enviado", "referencia": referencia}

    def verificar_status(self, referencia):
        return {"status": "confirmado"}
