from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated  # Protege endpoints
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet  # CRUD base DRF

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from apps.insurer.models.tenant_coverage_plan import TenantCoveragePlan

from ..filters import CoveragePlanFilter, InsurerFilter, ProcedureAuthorizationFilter, TenantCoveragePlanFilter
from ..serializers import (
    CoveragePlanSerializer,
    InsurerSerializer,
    ProcedureAuthorizationSerializer,
    TenantCoveragePlanSerializer,
)


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


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

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        auth = self.get_object()
        try:
            auth.approve(authorization_code=request.data.get("authorization_code", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(auth).data)

    @action(detail=True, methods=["post"], url_path="negar", url_name="negar")
    def negar(self, request, pk=None):
        auth = self.get_object()
        try:
            auth.deny(reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(auth).data)


class CoveragePlanViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CoveragePlan.objects.select_related("insurer")
    serializer_class = CoveragePlanSerializer
    filterset_class = CoveragePlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "description", "insurer__name", "insurer__external_code"]
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


class TenantCoveragePlanViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TenantCoveragePlan.objects.select_related("global_plan", "global_plan__insurer")
    serializer_class = TenantCoveragePlanSerializer
    filterset_class = TenantCoveragePlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "name",
        "description",
        "global_plan__name",
        "global_plan__insurer__name",
        "global_plan__insurer__external_code",
    ]
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
        "global_plan",
        "override_percentage",
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
    "procedure_authorization": ProcedureAuthorizationViewSet,
    "coverage_plan": CoveragePlanViewSet,
    "tenant_coverage_plan": TenantCoveragePlanViewSet,
    "insurer": InsurerViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "CoveragePlanViewSet",
    "InsurerViewSet",
    "ProcedureAuthorizationViewSet",
    "TenantCoveragePlanViewSet",
]

