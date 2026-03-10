from .base import CanalBase
from integracoes.mensageria.whatsapp import WhatsAppService


class CanalWhatsApp(CanalBase):
    def __init__(self):
        self._servico = WhatsAppService()

    def enviar(self, destino, mensagem, assunto=None, **kwargs):
        return self._servico.send(
            destination=destino,
            message=mensagem,
        )
