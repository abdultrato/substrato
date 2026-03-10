from .base import CanalBase
from integracoes.mensageria.email import EmailService


class CanalEmail(CanalBase):
    def __init__(self):
        self._servico = EmailService()

    def enviar(self, destino, mensagem, assunto=None, **kwargs):
        return self._servico.send(
            destination=destino,
            message=mensagem,
            subject=assunto or "Notificação",
        )
