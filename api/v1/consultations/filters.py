from api.core.filters import SafeFilterSet
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.human_resources.models.employee import Employee


class ConsultaMedicaFilter(SafeFilterSet):
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


class MedicoFilter(SafeFilterSet):
    class Meta:
        model = Employee
        fields = ["nome", "profissao", "cargo", "estado", "criado_em"]


class EspecialidadeConsultaFilter(SafeFilterSet):
    class Meta:
        model = ConsultationSpecialty
        fields = ["nome", "ativo", "preco_base"]


class FeriadoFilter(SafeFilterSet):
    class Meta:
        model = Holiday
        fields = ["data", "ativo"]


FILTER_MAP = {
    "consulta": ConsultaMedicaFilter,
    "medicos": MedicoFilter,
    "especialidade": EspecialidadeConsultaFilter,
    "feriado": FeriadoFilter,
}
