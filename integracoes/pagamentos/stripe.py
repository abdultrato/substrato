import stripe
from django.conf import settings

from .adapters import PaymentGateway

stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeGateway(PaymentGateway):
    name = "stripe"

    def charge(self, amount, reference, phone=None):
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),
            currency="usd",
            metadata={"reference": reference},
        )
        return intent

    def status(self, transaction_id):
        return stripe.PaymentIntent.retrieve(transaction_id)

    def refund(self, transaction_id, amount=None):
        return stripe.Refund.create(payment_intent=transaction_id)
