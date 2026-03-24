from api.core.filters import SafeFilterSet
from apps.reception.models.checkin_recepcao import CheckinRecepcao


class CheckinRecepcaoFilter(SafeFilterSet):
    class Meta:
        model = CheckinRecepcao
        fields = [
            "inquilino",
            "paciente",
            "requisicao",
            "fatura",
            "atendente",
            "prioridade",
            "estado",
            "chegou_em",
            "chamado_em",
            "concluido_em",
            "criado_em",
        ]


FILTER_MAP = {
    "checkin": CheckinRecepcaoFilter,
}
