from .base import CanalBase
from integracoes.mensageria.sms import SMSService


class CanalSMS(CanalBase):
    def __init__(self):
        self._servico = SMSService()

    def enviar(self, destino, mensagem, assunto=None, **kwargs):
        return self._servico.send(
            destination=destino,
            message=mensagem,
        )
