from api.core.filters import SafeFilterSet
from aplicativos.consultas.modelos.consulta_medica import ConsultaMedica
from aplicativos.consultas.modelos.especialidade_consulta import EspecialidadeConsulta
from aplicativos.consultas.modelos.feriado import Feriado
from aplicativos.identidade.modelos.usuario import Usuario


class ConsultaMedicaFilter(SafeFilterSet):
    class Meta:
        model = ConsultaMedica
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
        model = Usuario
        fields = ["username", "first_name", "last_name", "is_active"]


class EspecialidadeConsultaFilter(SafeFilterSet):
    class Meta:
        model = EspecialidadeConsulta
        fields = ["nome", "ativo", "preco_base"]


class FeriadoFilter(SafeFilterSet):
    class Meta:
        model = Feriado
        fields = ["data", "ativo"]


FILTER_MAP = {
    "consulta": ConsultaMedicaFilter,
    "medicos": MedicoFilter,
    "especialidade": EspecialidadeConsultaFilter,
    "feriado": FeriadoFilter,
}
