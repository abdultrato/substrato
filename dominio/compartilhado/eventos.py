class EventoDominio:
    pass

class ResultadoLiberado(EventoDominio):
    def __init__(self, paciente_id):
        self.paciente_id = paciente_id
