from api.core.filters import SafeFilterSet  # Base com saneamento
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization

# =====================================================
# PROCEDURE AUTHORIZATIONS
# =====================================================


class ProcedureAuthorizationFilter(SafeFilterSet):
    class Meta:
        model = ProcedureAuthorization
        fields = [
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


# =====================================================
# COVERAGE PLANS
# =====================================================


class CoveragePlanFilter(SafeFilterSet):
    class Meta:
        model = CoveragePlan
        fields = [
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


# =====================================================
# INSURERS
# =====================================================


class InsurerFilter(SafeFilterSet):
    class Meta:
        model = Insurer
        fields = [
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


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "autorizacaoprocedimento": ProcedureAuthorizationFilter,
    "planocobertura": CoveragePlanFilter,
    "insurer": InsurerFilter,
}

