from .base import CanalBase

class CanalSMS(CanalBase):

    def enviar(self, destino, mensagem):
        # integração com gateway SMS
        print(f"SMS enviado para {destino}")
