from abc import ABC, abstractmethod


class GatewayPagamento(ABC):
    name: str

    @abstractmethod
    def iniciar_pagamento(self, valor, referencia):
        pass

    @abstractmethod
    def verificar_status(self, referencia):
        pass

    @abstractmethod
    def reembolsar(self, referencia, valor=None):
        pass
