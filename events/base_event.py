from .contract import Event


class BaseEvent(Event):
    """
    Evento corporativo padrão.
    """

    def __init__(self, nome: str, payload: dict):
        super().__init__(nome=nome, payload=payload)


EventoBase = BaseEvent
