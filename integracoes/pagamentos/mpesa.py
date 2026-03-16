from django.conf import settings
import requests

from .base import PaymentGateway


class MpesaGateway(PaymentGateway):
    name = "mpesa"

    def charge(self, amount, reference, phone):
        payload = {
            "amount": amount,
            "phone": phone,
            "reference": reference,
        }

        response = requests.post(
            settings.MPESA_API_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.MPESA_API_KEY}"},
            timeout=15,
        )

        response.raise_for_status()
        return response.json()

    def status(self, transaction_id):
        response = requests.get(
            f"{settings.MPESA_API_URL}/{transaction_id}",
            headers={"Authorization": f"Bearer {settings.MPESA_API_KEY}"},
            timeout=10,
        )

        response.raise_for_status()
        return response.json()

    def refund(self, transaction_id, amount=None):
        payload = {"amount": amount}

        response = requests.post(
            f"{settings.MPESA_API_URL}/{transaction_id}/refund",
            json=payload,
            headers={"Authorization": f"Bearer {settings.MPESA_API_KEY}"},
            timeout=15,
        )

        response.raise_for_status()
        return response.json()
