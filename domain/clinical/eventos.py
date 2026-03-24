# LOCAL: dominio/clinico/events.py


class ResultadoValidadoEvent:
    def __init__(self, resultado_id):
        self.resultado_id = resultado_id
