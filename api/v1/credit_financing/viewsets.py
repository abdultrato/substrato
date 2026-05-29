from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.credit_financing.models import (
    CreditInstallment,
    ElectiveProcedureFinancing,
    HealthConsortium,
    ReimbursementClaim,
    StudentFunding,
)

from .filters import (
    CreditInstallmentFilter,
    ElectiveProcedureFinancingFilter,
    HealthConsortiumFilter,
    ReimbursementClaimFilter,
    StudentFundingFilter,
)
from .serializers import (
    CreditInstallmentSerializer,
    ElectiveProcedureFinancingSerializer,
    HealthConsortiumSerializer,
    ReimbursementClaimSerializer,
    StudentFundingSerializer,
)


class CreditFinancingModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class HealthConsortiumViewSet(CreditFinancingModelViewSet):
    queryset = HealthConsortium.objects.select_related("patient", "sponsor_company", "invoice").all()
    serializer_class = HealthConsortiumSerializer
    filterset_class = HealthConsortiumFilter
    search_fields = ["custom_id", "name", "quota_number", "patient__name", "sponsor_company__name", "covered_services"]
    ordering = ["-start_date", "name"]


class ElectiveProcedureFinancingViewSet(CreditFinancingModelViewSet):
    queryset = ElectiveProcedureFinancing.objects.select_related("patient", "invoice", "financier_company").prefetch_related("installments")
    serializer_class = ElectiveProcedureFinancingSerializer
    filterset_class = ElectiveProcedureFinancingFilter
    search_fields = ["custom_id", "contract_number", "approval_reference", "patient__name", "procedure_description", "notes"]
    ordering = ["-start_date", "-created_at"]


class CreditInstallmentViewSet(CreditFinancingModelViewSet):
    queryset = CreditInstallment.objects.select_related("procedure_financing", "student_funding", "invoice", "payment").all()
    serializer_class = CreditInstallmentSerializer
    filterset_class = CreditInstallmentFilter
    search_fields = ["custom_id", "procedure_financing__custom_id", "student_funding__custom_id", "notes"]
    ordering = ["due_date", "installment_number", "id"]


class ReimbursementClaimViewSet(CreditFinancingModelViewSet):
    queryset = ReimbursementClaim.objects.select_related("patient", "invoice", "payer_company").all()
    serializer_class = ReimbursementClaimSerializer
    filterset_class = ReimbursementClaimFilter
    search_fields = ["custom_id", "administrative_reference", "payer_company__name", "patient__name", "glosa_reason", "appeal_notes", "notes"]
    ordering = ["-submitted_at", "-created_at"]


class StudentFundingViewSet(CreditFinancingModelViewSet):
    queryset = StudentFunding.objects.select_related(
        "student",
        "student__user",
        "enrollment",
        "enrollment__classroom",
        "course",
        "sponsor_company",
    ).prefetch_related("installments")
    serializer_class = StudentFundingSerializer
    filterset_class = StudentFundingFilter
    search_fields = ["custom_id", "application_reference", "approval_reference", "student__student_code", "student__user__username", "course__name", "conditions"]
    ordering = ["-start_date", "-created_at"]


VIEWSET_MAP = {
    "consortium": HealthConsortiumViewSet,
    "procedure_financing": ElectiveProcedureFinancingViewSet,
    "installment": CreditInstallmentViewSet,
    "reimbursement_claim": ReimbursementClaimViewSet,
    "student_funding": StudentFundingViewSet,
}
