from abc import ABC, abstractmethod


class PaymentGateway(ABC):
    name: str

    @abstractmethod
    def charge(self, amount, reference, phone=None):
        pass

    @abstractmethod
    def status(self, transaction_id):
        pass

    @abstractmethod
    def refund(self, transaction_id, amount=None):
        pass


GatewayPagamento = PaymentGateway
