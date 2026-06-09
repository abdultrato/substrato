from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated  # Protege endpoints
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet  # CRUD base

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.external_entities.models.company import Company  # Modelo alvo

from ..filters import EmpresaFilter  # Filtro registrado
from ..serializers import EmpresaSerializer  # Serializador padrão


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


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

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        company = self.get_object()
        try:
            company.activate()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(company).data)

    @action(detail=True, methods=["post"], url_path="inativar", url_name="inativar")
    def inativar(self, request, pk=None):
        company = self.get_object()
        try:
            company.deactivate()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(company).data)


VIEWSET_MAP = {
    "empresa": EmpresaViewSet,  # Alias usado no roteamento dinâmico
}

__all__ = [
    "VIEWSET_MAP",
    "EmpresaViewSet",
]
