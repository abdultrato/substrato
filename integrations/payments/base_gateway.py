"""Interface base para gateways de pagamento externos."""

from abc import ABC, abstractmethod


class PaymentGateway(ABC):
    """Define o contrato mínimo para cobrança, status e estorno."""

    name: str

    @abstractmethod
    def charge(self, amount, reference, phone=None):
        """Realiza uma cobrança no provedor."""
        pass

    @abstractmethod
    def status(self, transaction_id):
        """Consulta o estado de uma transação no provedor."""
        pass

    @abstractmethod
    def refund(self, transaction_id, amount=None):
        """Solicita estorno total ou parcial."""
        pass


GatewayPagamento = PaymentGateway
