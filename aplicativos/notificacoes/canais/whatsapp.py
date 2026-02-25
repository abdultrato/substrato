from .base import CanalBase

class CanalWhatsApp(CanalBase):

    def enviar(self, destino, mensagem):
        print(f"WhatsApp enviado para {destino}")
