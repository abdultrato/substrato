import requests
from django.conf import settings

from .adapters import MessagingService


class WhatsAppService(MessagingService):
    name = "whatsapp"

    def send(self, destination, message, **kwargs):
        payload = {
            "to": destination,
            "message": message,
        }

        response = requests.post(
            settings.WHATSAPP_API_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.WHATSAPP_API_KEY}"},
            timeout=10,
        )

        response.raise_for_status()
        return response.json()
