class BaseInsurerAdapter:
    def query_authorization(self, date):
        raise NotImplementedError

    def submit_request(self, date):
        raise NotImplementedError


BaseSeguradoraAdapter = BaseInsurerAdapter
BaseInsurerAdapter.consultar_autorizacao = BaseInsurerAdapter.query_authorization
BaseInsurerAdapter.enviar_solicitacao = BaseInsurerAdapter.submit_request
