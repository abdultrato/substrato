from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.credit_financing.services import CreditFinancingWorkflowService
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


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


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

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.activate_consortium(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="contemplar", url_name="contemplar")
    def contemplar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.award_consortium(obj, awarded_at=request.data.get("awarded_at") or None)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="encerrar", url_name="encerrar")
    def encerrar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.complete_consortium(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.cancel_consortium(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class ElectiveProcedureFinancingViewSet(CreditFinancingModelViewSet):
    queryset = ElectiveProcedureFinancing.objects.select_related("patient", "invoice", "financier_company").prefetch_related("installments")
    serializer_class = ElectiveProcedureFinancingSerializer
    filterset_class = ElectiveProcedureFinancingFilter
    search_fields = ["custom_id", "contract_number", "approval_reference", "patient__name", "procedure_description", "notes"]
    ordering = ["-start_date", "-created_at"]

    @action(detail=True, methods=["post"], url_path="analisar", url_name="analisar")
    def analisar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.analyze_financing(obj, risk_rating=request.data.get("risk_rating"))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.approve_financing(
                obj,
                approval_reference=request.data.get("approval_reference", ""),
                first_due_date=request.data.get("first_due_date") or None,
                periodicity_months=int(request.data.get("periodicity_months", 1) or 1),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="rejeitar", url_name="rejeitar")
    def rejeitar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.reject_financing(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.cancel_financing(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class CreditInstallmentViewSet(CreditFinancingModelViewSet):
    queryset = CreditInstallment.objects.select_related("procedure_financing", "student_funding", "invoice", "payment").all()
    serializer_class = CreditInstallmentSerializer
    filterset_class = CreditInstallmentFilter
    search_fields = ["custom_id", "procedure_financing__custom_id", "student_funding__custom_id", "notes"]
    ordering = ["due_date", "installment_number", "id"]

    @action(detail=True, methods=["post"], url_path="pagar", url_name="pagar")
    def pagar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.pay_installment(obj, amount=request.data.get("amount", "0"))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="aplicar-multa", url_name="aplicar-multa")
    def aplicar_multa(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.apply_late_fee(
                obj,
                fee_amount=request.data.get("fee_amount", "0"),
                interest_amount=request.data.get("interest_amount", "0"),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="perdoar", url_name="perdoar")
    def perdoar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.waive_installment(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="estornar", url_name="estornar")
    def estornar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.reverse_payment(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class ReimbursementClaimViewSet(CreditFinancingModelViewSet):
    queryset = ReimbursementClaim.objects.select_related("patient", "invoice", "payer_company").all()
    serializer_class = ReimbursementClaimSerializer
    filterset_class = ReimbursementClaimFilter
    search_fields = ["custom_id", "administrative_reference", "payer_company__name", "patient__name", "glosa_reason", "appeal_notes", "notes"]
    ordering = ["-submitted_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.approve_claim(obj, approved_amount=request.data.get("approved_amount", "0"))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="rejeitar", url_name="rejeitar")
    def rejeitar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.reject_claim(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="registrar-reembolso", url_name="registrar-reembolso")
    def registrar_reembolso(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.register_reimbursement(obj, amount=request.data.get("amount", "0"))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


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

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.approve_funding(obj, approval_reference=request.data.get("approval_reference", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="suspender", url_name="suspender")
    def suspender(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.suspend_funding(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="revogar", url_name="revogar")
    def revogar(self, request, pk=None):
        obj = self.get_object()
        try:
            CreditFinancingWorkflowService.revoke_funding(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


VIEWSET_MAP = {
    "consortium": HealthConsortiumViewSet,
    "procedure_financing": ElectiveProcedureFinancingViewSet,
    "installment": CreditInstallmentViewSet,
    "reimbursement_claim": ReimbursementClaimViewSet,
    "student_funding": StudentFundingViewSet,
}
