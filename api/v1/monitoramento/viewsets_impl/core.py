from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.monitoramento.modelos.erro_sistema import ErroSistema

from ..filters import ErroSistemaFilter
from ..serializers import ErroSistemaSerializer


class ErroSistemaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ReadOnlyModelViewSet):
    queryset = ErroSistema.objects.select_related("usuario").all()
    serializer_class = ErroSistemaSerializer
    filterset_class = ErroSistemaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["caminho", "exception_class", "mensagem", "usuario__username"]
    ordering_fields = ["criado_em", "status_code", "exception_class"]
    ordering = ["-criado_em", "-id"]


VIEWSET_MAP = {
    "erro": ErroSistemaViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "ErroSistemaViewSet",
]
