from django.core.mail import send_mail
from .base import CanalBase

class CanalEmail(CanalBase):

    def enviar(self, destino, mensagem):
        send_mail(
            subject="Notificação",
            message=mensagem,
            from_email=None,
            recipient_list=[destino],
        )
