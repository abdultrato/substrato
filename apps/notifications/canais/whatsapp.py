from integrations.messaging.whatsapp import WhatsAppService

from .base import CanalBase


class CanalWhatsApp(CanalBase):
    def __init__(self):
        self._servico = WhatsAppService()

    def enviar(self, destino, mensagem, assunto=None, **kwargs):
        return self._servico.send(
            destination=destino,
            message=mensagem,
        )
