from api.core.filters import SafeFilterSet
from apps.surgery.models.surgery import Surgery
from apps.surgery.models.surgical_procedure import SurgicalProcedure


class SurgeryFilter(SafeFilterSet):
    class Meta:
        model = Surgery
        fields = [
            "paciente",
            "cirurgiao",
            "estado",
            "agendada_para",
            "criado_em",
        ]


class SurgicalProcedureFilter(SafeFilterSet):
    class Meta:
        model = SurgicalProcedure
        fields = [
            "nome",
            "ativo",
            "criado_em",
        ]


FILTER_MAP = {
    "cirurgia": SurgeryFilter,
    "procedimentocirurgico": SurgicalProcedureFilter,
}

CirurgiaFilter = SurgeryFilter
ProcedimentoCirurgicoFilter = SurgicalProcedureFilter
