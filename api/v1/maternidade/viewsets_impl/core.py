from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.maternidade.modelos.gestacao import Gestacao

from ..filters import GestacaoFilter
from ..serializers import GestacaoSerializer


class GestacaoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Gestacao.objects.select_related("paciente", "medico_responsavel").all()
    serializer_class = GestacaoSerializer
    filterset_class = GestacaoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "paciente__nome", "medico_responsavel__nome"]
    ordering_fields = ["criado_em", "estado", "data_prevista_parto"]
    ordering = ["-criado_em", "-id"]


VIEWSET_MAP = {
    "gestacao": GestacaoViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "GestacaoViewSet",
]
