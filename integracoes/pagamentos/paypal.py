import requests
from django.conf import settings

from .base import PaymentGateway


class PaypalGateway(PaymentGateway):
    name = "paypal"

    def _auth_header(self):
        return {
            "Authorization": f"Bearer {settings.PAYPAL_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }

    def charge(self, amount, reference, phone=None):
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": reference,
                    "amount": {
                        "currency_code": "USD",
                        "value": str(amount),
                    },
                }
            ],
        }

        response = requests.post(
            f"{settings.PAYPAL_API_URL}/v2/checkout/orders",
            json=payload,
            headers=self._auth_header(),
            timeout=15,
        )

        response.raise_for_status()
        return response.json()

    def status(self, transaction_id):
        response = requests.get(
            f"{settings.PAYPAL_API_URL}/v2/checkout/orders/{transaction_id}",
            headers=self._auth_header(),
            timeout=10,
        )

        response.raise_for_status()
        return response.json()

    def refund(self, transaction_id, amount=None):
        payload = {}

        if amount:
            payload["amount"] = {
                "currency_code": "USD",
                "value": str(amount),
            }

        response = requests.post(
            f"{settings.PAYPAL_API_URL}/v2/payments/captures/{transaction_id}/refund",
            json=payload,
            headers=self._auth_header(),
            timeout=15,
        )

        response.raise_for_status()
        return response.json()
