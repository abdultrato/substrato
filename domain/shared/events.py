class DomainEvent:
    pass


class ResultReleased(DomainEvent):
    def __init__(self, patient_id):
        self.patient_id = patient_id


EventoDominio = DomainEvent
ResultadoLiberado = ResultReleased
