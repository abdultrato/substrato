import requests
from django.conf import settings

from .adapters import MessagingService


class SMSService(MessagingService):
    name = "sms"

    def send(self, destination, message, **kwargs):
        payload = {
            "to": destination,
            "message": message,
        }

        response = requests.post(
            settings.SMS_API_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.SMS_API_KEY}"},
            timeout=10,
        )

        response.raise_for_status()
        return response.json()
