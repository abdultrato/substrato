class BaseChannel:
    """
    Simple contract for notification channels.
    Concrete implementations must override `send`.
    """

    name = "base"

    def send(self, destination, message, subject=None, **kwargs):  # pragma: no cover - interface
        raise NotImplementedError("BaseChannel.send must be implemented by concrete channels.")

    def enviar(self, destino, mensagem, assunto=None, **kwargs):  # pragma: no cover - compatibility alias
        return self.send(destination=destino, message=mensagem, subject=assunto, **kwargs)


CanalBase = BaseChannel
