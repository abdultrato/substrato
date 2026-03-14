from api.core.filters import SafeFilterSet

from aplicativos.cirurgia.modelos.cirurgia import Cirurgia
from aplicativos.cirurgia.modelos.procedimento_cirurgico import ProcedimentoCirurgico


class CirurgiaFilter(SafeFilterSet):
    class Meta:
        model = Cirurgia
        fields = [
            "paciente",
            "cirurgiao",
            "estado",
            "agendada_para",
            "criado_em",
        ]


class ProcedimentoCirurgicoFilter(SafeFilterSet):
    class Meta:
        model = ProcedimentoCirurgico
        fields = [
            "nome",
            "ativo",
            "criado_em",
        ]


FILTER_MAP = {
    "cirurgia": CirurgiaFilter,
    "procedimentocirurgico": ProcedimentoCirurgicoFilter,
}
