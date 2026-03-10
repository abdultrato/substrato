class CanalBase:

    def enviar(self, destino, mensagem, assunto=None, **kwargs):
        raise NotImplementedError
