import stripe
from django.conf import settings

from .base import PaymentGateway


stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeGateway(PaymentGateway):
    name = "stripe"

    def charge(self, amount, reference, phone=None):
        # Stripe usa centavos
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),
            currency="usd",
            metadata={"reference": reference},
        )

        return {
            "transaction_id": intent.id,
            "status": intent.status,
        }

    def status(self, transaction_id):
        intent = stripe.PaymentIntent.retrieve(transaction_id)

        return {
            "transaction_id": intent.id,
            "status": intent.status,
        }

    def refund(self, transaction_id, amount=None):
        refund = stripe.Refund.create(
            payment_intent=transaction_id,
            amount=int(amount * 100) if amount else None,
        )

        return {
            "refund_id": refund.id,
            "status": refund.status,
        }
