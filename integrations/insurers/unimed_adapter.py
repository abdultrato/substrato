from .base_adapter import BaseInsurerAdapter


class UnimedAdapter(BaseInsurerAdapter):
    def query_authorization(self, date):
        # chamada real API externa
        return {"status": "APROVADA", "code": "AUTH12345"}


UnimedAdapter.consultar_autorizacao = UnimedAdapter.query_authorization
