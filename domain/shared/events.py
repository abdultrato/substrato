"""Eventos de domínio compartilhados usados por diversos contextos."""


class DomainEvent:
    """Classe base mínima para eventos de domínio."""

    pass


class ResultReleased(DomainEvent):
    """Evento disparado quando um resultado clínico é liberado para um paciente."""

    def __init__(self, patient_id):
        """Armazena o identificador do paciente associado ao resultado."""
        self.patient_id = patient_id


EventoDominio = DomainEvent
ResultadoLiberado = ResultReleased
