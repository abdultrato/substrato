from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.maternity.models.pregnancy import Pregnancy

from ..filters import PregnancyFilter
from ..serializers import PregnancySerializer


class PregnancyViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Pregnancy.objects.select_related("paciente", "medico_responsavel").all()
    serializer_class = PregnancySerializer
    filterset_class = PregnancyFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "paciente__nome", "medico_responsavel__nome"]
    ordering_fields = ["criado_em", "estado", "data_prevista_parto"]
    ordering = ["-criado_em", "-id"]


VIEWSET_MAP = {
    "gestacao": PregnancyViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "PregnancyViewSet",
]

GestacaoViewSet = PregnancyViewSet
