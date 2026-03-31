"""Eventos de domínio clínico."""


class ResultValidatedEvent:
    """Disparado quando um resultado é validado."""

    def __init__(self, result_id):
        self.result_id = result_id


ResultadoValidadoEvent = ResultValidatedEvent
