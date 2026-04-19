from rest_framework.permissions import IsAuthenticated  # Protege endpoints
from rest_framework.viewsets import ModelViewSet  # CRUD base

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.external_entities.models.company import Company  # Modelo alvo

from ..filters import EmpresaFilter  # Filtro registrado
from ..serializers import EmpresaSerializer  # Serializador padrão


class EmpresaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Company.objects.all()  # Fonte inicial (scoped pelo mixin)
    serializer_class = EmpresaSerializer  # Define como serializar payloads
    filterset_class = EmpresaFilter  # Filtros permitidos via query params
    permission_classes = [IsAuthenticated]  # Restrição de acesso
    search_fields = ["custom_id", "name", "nuit", "email", "phone1", "phone2"]  # Campos de busca full-text
    ordering_fields = [  # Campos permitidos para ordenação
        "name",
        "nuit",
        "active",
        "created_at",
        "updated_at",
    ]
    ordering = ["name"]  # Ordenação padrão


VIEWSET_MAP = {
    "empresa": EmpresaViewSet,  # Alias usado no roteamento dinâmico
}

__all__ = [
    "VIEWSET_MAP",
    "EmpresaViewSet",
]
