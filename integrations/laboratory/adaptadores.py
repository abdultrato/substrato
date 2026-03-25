from django.conf import settings


class MessagingService:
    """
    Interface base para serviços de comunicação.
    """

    name = "base"

    def send(self, destination: str, message: str, **kwargs):
        raise NotImplementedError


def get_messaging_service(channel: str | None = None) -> MessagingService:
    """
    Retoma serviço de comunicação baseado no channel.
    """

    channel = channel or getattr(settings, "DEFAULT_MESSAGING_CHANNEL", "sms")

    services = {
        "sms": "viewsets.integrations.messaging.sms.SMSService",
        "whatsapp": "viewsets.integrations.messaging.whatsapp.WhatsAppService",
        "email": "viewsets.integrations.messaging.email.EmailService",
    }

    if channel not in services:
        raise ValueError(f"Canal desconhecido: {channel}")

    module_path, class_name = services[channel].rsplit(".", 1)

    module = __import__(module_path, fromlist=[class_name])
    return getattr(module, class_name)()
