from rest_framework.permissions import IsAuthenticated  # Protege endpoints
from rest_framework.viewsets import ModelViewSet  # CRUD base DRF

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization

from ..filters import CoveragePlanFilter, InsurerFilter, ProcedureAuthorizationFilter
from ..serializers import CoveragePlanSerializer, InsurerSerializer, ProcedureAuthorizationSerializer


class ProcedureAuthorizationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ProcedureAuthorization.objects.all()
    serializer_class = ProcedureAuthorizationSerializer
    filterset_class = ProcedureAuthorizationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "description", "status", "authorization_code"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "description",
        "name",
        "order",
        "active",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "request_id",
        "plan",
        "status",
        "authorization_code",
        "response_date",
    ]
    ordering = ["-created_at"]


class CoveragePlanViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CoveragePlan.objects.all()
    serializer_class = CoveragePlanSerializer
    filterset_class = CoveragePlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "description"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "description",
        "name",
        "order",
        "active",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "insurer",
        "coverage_percentage",
        "requires_authorization",
    ]
    ordering = ["-created_at"]


class InsurerViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Insurer.objects.all()
    serializer_class = InsurerSerializer
    filterset_class = InsurerFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "email", "phone", "description", "external_code"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "description",
        "name",
        "order",
        "active",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "external_code",
        "email",
        "phone",
        "active",
    ]
    ordering = ["-created_at"]


VIEWSET_MAP = {
    "autorizacaoprocedimento": ProcedureAuthorizationViewSet,
    "planocobertura": CoveragePlanViewSet,
    "insurer": InsurerViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "CoveragePlanViewSet",
    "InsurerViewSet",
    "ProcedureAuthorizationViewSet",
]

