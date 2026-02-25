from .adapters import PaymentGateway


class MKeshGateway(PaymentGateway):
    name = "mkesh"

    def charge(self, amount, reference, phone):
        return {
            "status": "pending",
            "gateway": self.name,
            "amount": amount,
        }

    def status(self, transaction_id):
        return {"status": "processing"}

    def refund(self, transaction_id, amount=None):
        return {"status": "refunded"}
