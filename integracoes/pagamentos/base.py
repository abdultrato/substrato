class GatewayPagamento:

    def iniciar_pagamento(self, valor, referencia):
        raise NotImplementedError

    def verificar_status(self, referencia):
        raise NotImplementedError
