from api.core.filters import SafeFilterSet
from apps.reception.models.reception_checkin import ReceptionCheckin


class ReceptionCheckinFilter(SafeFilterSet):
    class Meta:
        model = ReceptionCheckin
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
    "checkin": ReceptionCheckinFilter,
}


CheckinRecepcaoFilter = ReceptionCheckinFilter
