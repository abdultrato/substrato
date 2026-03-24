from integrations.messaging.email import EmailService

from .base import BaseChannel


class EmailChannel(BaseChannel):
    def __init__(self):
        self._service = EmailService()

    def send(self, destination, message, subject=None, **kwargs):
        return self._service.send(
            destination=destination,
            message=message,
            subject=subject or "Notificação",
        )


CanalEmail = EmailChannel
