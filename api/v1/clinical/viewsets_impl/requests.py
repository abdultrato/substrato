from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from domain.clinical.result_state import ResultState

from ..filters import LabRequestFilter, LabRequestItemFilter
from ..serializers import (
    LaboratoryResultItemSerializer,
    LabRequestItemSerializer,
    LabRequestSerializer,
)


@extend_schema(
    description="Gerenciamento de requisições de análise",
    tags=["Clínico - Requisições"],
)
class LabRequestViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """Viewset for laboratory and medical requests."""

    queryset = LabRequest.objects.all()
    serializer_class = LabRequestSerializer
    filterset_class = LabRequestFilter
    permission_classes = [IsAuthenticated]
    # LabRequest does not expose `name`/`description`/`active`/`order`/`notes`/`status`.
    # Keep search focused on request code, patient, and state.
    search_fields = [
        "custom_id",
        "patient__custom_id",
        "patient__name",
        "patient__document_number",
        "analyst__username",
        "type",
        "status",
        "clinical_status",
        "requesting_company__name",
        "external_executing_company__name",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "patient",
        "analyst",
        "type",
        "status",
        "clinical_status",
        "has_critical_result",
        "version",
    ]
    ordering = ["-created_at"]

    @action(detail=True, methods=["get"], url_path="pdf_resultados", url_name="pdf-resultados")
    def results_pdf(self, request, pk=None):
        """
        Generate the institutional PDF for validated laboratory results.

        Access is still restricted via RBAC to avoid accidental exposure.
        """
        from security.permissions.rbac import GROUPS as RBAC_GROUPS, _normalize

        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            raise PermissionDenied("Autenticação obrigatória.")

        if not getattr(user, "is_superuser", False):
            try:
                raw_groups = list(user.groups.values_list("name", flat=True))
            except Exception:
                raw_groups = []
            user_groups = {_normalize(g) for g in raw_groups if g}
            permitidos = {
                _normalize(RBAC_GROUPS["ADMIN"]),
                _normalize(RBAC_GROUPS["LABORATORIO"]),
            }
            if not (user_groups & permitidos):
                raise PermissionDenied("Requer Técnico de Laboratório ou Administrador para emitir PDF de resultados.")

        request_record = self.get_object()
        # Result PDFs only apply to the laboratory workflow.
        if request_record.type != request_record.Tipo.LABORATORIO:
            raise PermissionDenied("Esta requisição não possui PDF de resultados laboratoriais.")

        result = getattr(request_record, "result", None)
        if not result or not result.itens.filter(status=ResultState.VALIDATED).exists():
            raise ValidationError("Não é possível emitir PDF sem nenhum result validado.")

        from tasks.generate_pdf.result_pdf_generator import generate_results_pdf

        pdf_bytes, filename = generate_results_pdf(request_record, apenas_validados=True)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp

    @action(detail=True, methods=["get"], url_path="result_itens", url_name="result-itens")
    def result_items(self, request, pk=None):
        """
        Return LAB result items with derived fields for inline entry/validation.
        """
        request_record = self.get_object()

        if request_record.type != request_record.Tipo.LABORATORIO:
            raise PermissionDenied("Esta requisição não possui resultados laboratoriais.")

        from apps.clinical.models.result import Result

        result, _ = Result.objects.get_or_create(
            request=request_record,
            defaults={"tenant": request_record.tenant},
        )

        qs = result.itens.select_related(
            "exam_field",
            "exam_field__exam",
            "result",
            "result__request",
            "result__request__patient",
        ).order_by(
            "exam_field__exam__name",
            "exam_field__name",
            "id",
        )

        items = LaboratoryResultItemSerializer(qs, many=True).data

        summary = {
            "total": qs.count(),
            "pendente": qs.filter(status=ResultState.PENDING).count(),
            "em_analise": qs.filter(status=ResultState.IN_ANALYSIS).count(),
            "aguardando_validacao": qs.filter(status=ResultState.AWAITING_VALIDATION).count(),
            "validado": qs.filter(status=ResultState.VALIDATED).count(),
            "rejeitado": qs.filter(status=ResultState.REJECTED).count(),
        }

        return Response(
            {
                "request": {
                    "id": request_record.id,
                    "custom_id": request_record.custom_id,
                    "patient": request_record.patient_id,
                    "patient_name": request_record.patient.name,
                    "status": request_record.status,
                    "clinical_status": request_record.clinical_status,
                    "has_critical_result": request_record.has_critical_result,
                },
                "summary": summary,
                "items": items,
                "resumo": summary,
                "itens": items,
            }
        )


@extend_schema(
    description="Gerenciamento de itens de requisição",
    tags=["Clínico - Requisições"],
)
class LabRequestItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """Viewset for request items."""

    queryset = LabRequestItem.objects.all()
    serializer_class = LabRequestItemSerializer
    filterset_class = LabRequestItemFilter
    permission_classes = [IsAuthenticated]
    # LabRequestItem does not expose `name`/`description`/`active`/`order`.
    search_fields = [
        "custom_id",
        "request__custom_id",
        "exam__custom_id",
        "exam__name",
        "medical_exam__custom_id",
        "medical_exam__name",
    ]
    ordering_fields = [
        "tenant",
        "deleted",
        "deleted_at",
        "created_by",
        "updated_by",
        "custom_id",
        "created_at",
        "updated_at",
        "request",
        "exam",
        "medical_exam",
        "version",
    ]
    ordering = ["-created_at"]


RequisicaoAnaliseViewSet = LabRequestViewSet
RequisicaoItemViewSet = LabRequestItemViewSet
