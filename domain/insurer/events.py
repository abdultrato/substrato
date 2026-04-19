"""Eventos do domínio de seguradoras (ex.: autorização solicitada)."""


class AuthorizationRequestedEvent:
    """Emissão de evento ao solicitar autorização de procedimento."""
    def __init__(self, authorization_id: int):
        self.autorizacao_id = authorization_id


AutorizacaoSolicitadaEvent = AuthorizationRequestedEvent
