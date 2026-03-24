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
def send_notification(destino: str, mensagem: str, canal: str):

    if canal not in CHANNELS:
        raise ValueError(f"Canal inválido: {canal}")

    notificacao = Notification.objects.create(
        destinatario=destino,
        mensagem=mensagem,
        canal=canal,
    )

    try:
        resposta = CHANNELS[canal].enviar(destino, mensagem)

        DeliveryLog.objects.create(
            notificacao=notificacao,
            status="sucesso",
            resposta=str(resposta),
        )

        notificacao.enviada = True
        notificacao.save(update_fields=["enviada"])

    except Exception as erro:
        DeliveryLog.objects.create(
            notificacao=notificacao,
            status="erro",
            resposta=str(erro),
        )

        raise DeliveryFailure(str(erro)) from erro

    return notificacao


CANAIS = CHANNELS
enviar_notificacao = send_notification
