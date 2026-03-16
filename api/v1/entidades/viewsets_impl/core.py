from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.entidades.modelos.empresa import Empresa

from ..filters import EmpresaFilter
from ..serializers import EmpresaSerializer


class EmpresaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    filterset_class = EmpresaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "nuit", "email", "telefone1", "telefone2"]
    ordering_fields = [
        "nome",
        "nuit",
        "ativo",
        "criado_em",
        "atualizado_em",
    ]
    ordering = ["nome"]


VIEWSET_MAP = {
    "empresa": EmpresaViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "EmpresaViewSet",
]
