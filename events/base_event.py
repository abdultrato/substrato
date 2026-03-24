from .contract import Evento


class EventoBase(Evento):
    """
    Evento corporativo padrão.
    """

    def __init__(self, nome: str, payload: dict):
        super().__init__(nome=nome, payload=payload)
