from api.core.filters import SafeFilterSet

from aplicativos.maternidade.modelos.gestacao import Gestacao


class GestacaoFilter(SafeFilterSet):
    class Meta:
        model = Gestacao
        fields = [
            "paciente",
            "medico_responsavel",
            "estado",
            "data_prevista_parto",
            "criado_em",
        ]


FILTER_MAP = {
    "gestacao": GestacaoFilter,
}

