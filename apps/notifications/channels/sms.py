from integrations.messaging.sms import SMSService

from .base import BaseChannel


class SMSChannel(BaseChannel):
    def __init__(self):
        self._service = SMSService()

    def send(self, destination, message, subject=None, **kwargs):
        return self._service.send(
            destination=destination,
            message=message,
        )


CanalSMS = SMSChannel
