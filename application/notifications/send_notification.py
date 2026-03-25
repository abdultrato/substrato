from django.db import transaction

from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification
from domain.notifications.exceptions import DeliveryFailure
from integrations.messaging.email import EmailService
from integrations.messaging.sms import SMSService
from integrations.messaging.whatsapp import WhatsAppService

CHANNELS = {
    "email": EmailService(),
    "sms": SMSService(),
    "whatsapp": WhatsAppService(),
}


@transaction.atomic
def send_notification(destination: str, message: str, channel: str):

    if channel not in CHANNELS:
        raise ValueError(f"Canal inválido: {channel}")

    notification = Notification.objects.create(
        recipient=destination,
        message=message,
        channel=channel,
    )

    try:
        response = CHANNELS[channel].send(destination, message)

        DeliveryLog.objects.create(
            notification=notification,
            status="sucesso",
            response=str(response),
        )

        notification.sent = True
        notification.save(update_fields=["sent"])

    except Exception as error:
        DeliveryLog.objects.create(
            notification=notification,
            status="error",
            response=str(error),
        )

        raise DeliveryFailure(str(error)) from error

    return notification
