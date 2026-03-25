from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.external_entities.models.company import Company

from ..filters import EmpresaFilter
from ..serializers import EmpresaSerializer


class EmpresaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = EmpresaSerializer
    filterset_class = EmpresaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "nuit", "email", "phone1", "phone2"]
    ordering_fields = [
        "name",
        "nuit",
        "active",
        "created_at",
        "updated_at",
    ]
    ordering = ["name"]


VIEWSET_MAP = {
    "empresa": EmpresaViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "EmpresaViewSet",
]
