class BaseSeguradoraAdapter:
    def consultar_autorizacao(self, dados):
        raise NotImplementedError

    def enviar_solicitacao(self, dados):
        raise NotImplementedError
