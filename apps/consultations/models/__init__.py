from .consultation_specialty import ConsultationSpecialty
from .holiday import Holiday
from .medical_consultation import MedicalConsultation

ConsultaMedica = MedicalConsultation
EspecialidadeConsulta = ConsultationSpecialty
Feriado = Holiday

__all__ = [
    "ConsultaMedica",
    "ConsultationSpecialty",
    "EspecialidadeConsulta",
    "Feriado",
    "Holiday",
    "MedicalConsultation",
]
