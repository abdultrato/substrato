from .adapters import PaymentGateway


class PaypalGateway(PaymentGateway):
    name = "paypal"

    def charge(self, amount, reference, phone=None):
        return {
            "status": "created",
            "gateway": self.name,
            "amount": amount,
            "reference": reference,
        }

    def status(self, transaction_id):
        return {"status": "completed"}

    def refund(self, transaction_id, amount=None):
        return {"status": "refunded"}
