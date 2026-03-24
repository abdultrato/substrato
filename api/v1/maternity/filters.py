from api.core.filters import SafeFilterSet
from apps.maternity.models.pregnancy import Pregnancy


class PregnancyFilter(SafeFilterSet):
    class Meta:
        model = Pregnancy
        fields = [
            "paciente",
            "medico_responsavel",
            "estado",
            "data_prevista_parto",
            "criado_em",
        ]


FILTER_MAP = {
    "gestacao": PregnancyFilter,
}

GestacaoFilter = PregnancyFilter
