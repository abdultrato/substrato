from .base_adapter import BaseSeguradoraAdapter


class UnimedAdapter(BaseSeguradoraAdapter):

    def consultar_autorizacao(self, dados):
        # chamada real API externa
        return {
            "status": "APROVADA",
            "codigo": "AUTH12345"
        }
