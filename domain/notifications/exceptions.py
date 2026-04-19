"""Exceções do domínio de notificações."""

class DeliveryFailure(Exception):
    """Falha ao enviar notificação para o destino."""


FalhaEnvio = DeliveryFailure
