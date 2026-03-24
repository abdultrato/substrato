from django.db import transaction

from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification
from domain.notifications.excecoes import FalhaEnvio
from integrations.messaging.email import EmailService
from integrations.messaging.sms import SMSService
from integrations.messaging.whatsapp import WhatsAppService

CANAIS = {
    "email": EmailService(),
    "sms": SMSService(),
    "whatsapp": WhatsAppService(),
}


@transaction.atomic
def enviar_notificacao(destino: str, mensagem: str, canal: str):

    if canal not in CANAIS:
        raise ValueError(f"Canal inválido: {canal}")

    notificacao = Notification.objects.create(
        destinatario=destino,
        mensagem=mensagem,
        canal=canal,
    )

    try:
        resposta = CANAIS[canal].enviar(destino, mensagem)

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

        raise FalhaEnvio(str(erro)) from erro

    return notificacao
