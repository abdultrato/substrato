from .modelos.notificacao import Notificacao
from .canais.email import CanalEmail
from .canais.sms import CanalSMS
from .canais.whatsapp import CanalWhatsApp

CANAIS = {
    "email": CanalEmail(),
    "sms": CanalSMS(),
    "whatsapp": CanalWhatsApp(),
}

class ServicoNotificacao:

    def enviar(self, destino, mensagem, canal):
        notificacao = Notificacao.objects.create(
            destinatario=destino,
            mensagem=mensagem,
            canal=canal
        )

        CANAIS[canal].enviar(destino, mensagem)

        notificacao.enviada = True
        notificacao.save()

        return notificacao
