from django.conf import settings
from django.core.mail import send_mail

from .adapters import MessagingService


class EmailService(MessagingService):
    name = "email"

    def send(self, destination, message, subject="Notificação", **kwargs):
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [destination],
            fail_silently=False,
        )

        return {"status": "sent"}
