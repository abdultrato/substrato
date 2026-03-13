class CanalBase:
    """
    Contrato simples para canais de notificação.
    Implementações concretas devem sobrescrever `enviar`.
    """

    name = "base"

    def enviar(self, destino, mensagem, assunto=None, **kwargs):  # pragma: no cover - interface
        raise NotImplementedError("CanalBase.enviar deve ser implementado pelos canais concretos.")
