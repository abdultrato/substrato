from integrations.messaging.whatsapp import WhatsAppService

from .base import BaseChannel


class WhatsAppChannel(BaseChannel):
    def __init__(self):
        self._service = WhatsAppService()

    def send(self, destination, message, subject=None, **kwargs):
        return self._service.send(
            destination=destination,
            message=message,
        )


CanalWhatsApp = WhatsAppChannel
