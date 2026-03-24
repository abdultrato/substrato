from api.core.filters import SafeFilterSet
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.human_resources.models.employee import Employee


class MedicalConsultationFilter(SafeFilterSet):
    class Meta:
        model = MedicalConsultation
        fields = [
            "paciente",
            "medico",
            "tipo",
            "estado",
            "tipo_horario",
            "feriado_manual",
            "agendada_para",
            "criado_em",
        ]


class DoctorFilter(SafeFilterSet):
    class Meta:
        model = Employee
        fields = ["nome", "profissao", "cargo", "estado", "criado_em"]


class ConsultationSpecialtyFilter(SafeFilterSet):
    class Meta:
        model = ConsultationSpecialty
        fields = ["nome", "ativo", "preco_base"]


class HolidayFilter(SafeFilterSet):
    class Meta:
        model = Holiday
        fields = ["data", "ativo"]


FILTER_MAP = {
    "consulta": MedicalConsultationFilter,
    "medicos": DoctorFilter,
    "especialidade": ConsultationSpecialtyFilter,
    "feriado": HolidayFilter,
}

# Backwards-compatible aliases while the rest of the codebase is still migrating.
ConsultaMedicaFilter = MedicalConsultationFilter
MedicoFilter = DoctorFilter
EspecialidadeConsultaFilter = ConsultationSpecialtyFilter
FeriadoFilter = HolidayFilter
