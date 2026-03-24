# LOCAL: dominio/seguradora/events.py


class AuthorizationRequestedEvent:
    def __init__(self, authorization_id: int):
        self.autorizacao_id = authorization_id


AutorizacaoSolicitadaEvent = AuthorizationRequestedEvent
