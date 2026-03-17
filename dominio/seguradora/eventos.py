# LOCAL: dominio/seguradora/eventos.py


class AutorizacaoSolicitadaEvent:
    def __init__(self, autorizacao_id: int):
        self.autorizacao_id = autorizacao_id
