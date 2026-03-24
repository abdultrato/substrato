from .base_gateway import PaymentGateway


class EmolaGateway(PaymentGateway):
    name = "emola"

    def charge(self, amount, reference, phone):
        return {
            "status": "pending",
            "gateway": self.name,
            "amount": amount,
            "reference": reference,
        }

    def status(self, transaction_id):
        return {"status": "processing"}

    def refund(self, transaction_id, amount=None):
        return {"status": "refunded"}
