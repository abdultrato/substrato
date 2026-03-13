from api.core.filters import SafeFilterSet

from aplicativos.consultas.modelos.consulta_medica import ConsultaMedica
from aplicativos.identidade.modelos.usuario import Usuario


class ConsultaMedicaFilter(SafeFilterSet):
    class Meta:
        model = ConsultaMedica
        fields = [
            "paciente",
            "medico",
            "tipo",
            "estado",
            "agendada_para",
            "criado_em",
        ]


class MedicoFilter(SafeFilterSet):
    class Meta:
        model = Usuario
        fields = ["username", "first_name", "last_name", "is_active"]


FILTER_MAP = {
    "consulta": ConsultaMedicaFilter,
    "medicos": MedicoFilter,
}

