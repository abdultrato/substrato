from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.monitoring.models.system_error import SystemError

from ..filters import SystemErrorFilter
from ..serializers import SystemErrorSerializer


class SystemErrorViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ReadOnlyModelViewSet):
    queryset = SystemError.objects.select_related("usuario").all()
    serializer_class = SystemErrorSerializer
    filterset_class = SystemErrorFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["caminho", "exception_class", "mensagem", "usuario__username"]
    ordering_fields = ["criado_em", "status_code", "exception_class"]
    ordering = ["-criado_em", "-id"]


VIEWSET_MAP = {
    "erro": SystemErrorViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "SystemErrorViewSet",
]

ErroSistemaViewSet = SystemErrorViewSet
