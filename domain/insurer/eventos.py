# LOCAL: dominio/seguradora/events.py


class AutorizacaoSolicitadaEvent:
    def __init__(self, autorizacao_id: int):
        self.autorizacao_id = autorizacao_id
