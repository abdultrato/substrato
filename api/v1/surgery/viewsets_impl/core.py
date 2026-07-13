"""ViewSets da API v1 para cirurgias, bloco operatório e catálogo cirúrgico."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.billing.models.invoice import Invoice
from apps.surgery.models import (
    AnesthesiaRecord,
    LargeSurgery,
    OperatingRoom,
    OperativeReport,
    PreoperativeAssessment,
    RecoveryRecord,
    SmallSurgery,
    Surgery,
    SurgeryProcedureItem,
    SurgicalAuditEvent,
    SurgicalAuthorization,
    SurgicalBillingItem,
    SurgicalConsumption,
    SurgicalDocument,
    SurgicalMaterial,
    SurgicalProcedure,
    SurgicalRequest,
    SurgicalSafetyChecklist,
    SurgicalSchedule,
    SurgicalSpecimen,
    SurgicalTeamMember,
)

from ..filters import (
    AnesthesiaRecordFilter,
    LargeSurgeryFilter,
    OperatingRoomFilter,
    OperativeReportFilter,
    PreoperativeAssessmentFilter,
    RecoveryRecordFilter,
    SmallSurgeryFilter,
    SurgeryFilter,
    SurgeryProcedureItemFilter,
    SurgicalAuditEventFilter,
    SurgicalAuthorizationFilter,
    SurgicalBillingItemFilter,
    SurgicalConsumptionFilter,
    SurgicalDocumentFilter,
    SurgicalMaterialFilter,
    SurgicalProcedureFilter,
    SurgicalRequestFilter,
    SurgicalSafetyChecklistFilter,
    SurgicalScheduleFilter,
    SurgicalSpecimenFilter,
    SurgicalTeamMemberFilter,
)
from ..serializers import (
    AnesthesiaRecordSerializer,
    LargeSurgerySerializer,
    OperatingRoomSerializer,
    OperativeReportSerializer,
    PreoperativeAssessmentSerializer,
    RecoveryRecordSerializer,
    SmallSurgerySerializer,
    SurgeryProcedureItemSerializer,
    SurgerySerializer,
    SurgicalAuditEventSerializer,
    SurgicalAuthorizationSerializer,
    SurgicalBillingItemSerializer,
    SurgicalConsumptionSerializer,
    SurgicalDocumentSerializer,
    SurgicalMaterialSerializer,
    SurgicalProcedureSerializer,
    SurgicalRequestSerializer,
    SurgicalSafetyChecklistSerializer,
    SurgicalScheduleSerializer,
    SurgicalSpecimenSerializer,
    SurgicalTeamMemberSerializer,
)


class BaseSurgeryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    fixed_surgery_size: str | None = None
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "procedure", "patient__name", "surgeon__username", "surgery_size"]
    ordering_fields = ["scheduled_for", "created_at", "status", "surgery_size"]
    ordering = ["-scheduled_for", "-created_at"]
    immutable_statuses = {
        Surgery.Status.SURGERY_COMPLETED,
        Surgery.Status.COMPLETED,
        Surgery.Status.IN_RECOVERY,
        Surgery.Status.RECOVERED,
        Surgery.Status.REPORT_PENDING,
        Surgery.Status.BILLING_PENDING,
        Surgery.Status.CLOSED,
    }

    def perform_create(self, serializer):
        if self.fixed_surgery_size:
            serializer.save(surgery_size=self.fixed_surgery_size)
            return
        serializer.save()

    def perform_update(self, serializer):
        if serializer.instance and serializer.instance.status in self.immutable_statuses:
            raise ValidationError("Cirurgia realizada tem processo atómico e não pode ser editada.")
        if self.fixed_surgery_size:
            serializer.save(surgery_size=self.fixed_surgery_size)
            return
        serializer.save()

    @action(detail=True, methods=["post"], url_path="create-invoice", url_name="create-invoice")
    def create_invoice(self, request, pk=None):
        surgery = self.get_object()

        if hasattr(surgery, "invoice") and getattr(surgery, "invoice", None):
            invoice = surgery.invoice
        else:
            invoice = Invoice(
                tenant=surgery.tenant,
                origin=Invoice.Origin.SURGERY,
                surgery=surgery,
                patient=surgery.patient,
            )
            invoice.full_clean()
            invoice.save()

        if invoice.status != Invoice.Status.DRAFT:
            raise ValidationError("A invoice vinculada já foi emitida/paga/cancelada.")

        invoice.sync_items_from_origin()

        emit = (request.data or {}).get("emitir", True)
        if emit:
            invoice.issue()

        return Response(
            {
                "surgery_id": surgery.id,
                "invoice_id": invoice.id,
                "invoice_code": invoice.custom_id,
                "invoice_status": invoice.status,
                "total": str(invoice.total),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="encaminhar-enfermaria", url_name="encaminhar-enfermaria")
    def encaminhar_enfermaria(self, request, pk=None):
        surgery = self.get_object()
        if surgery.status not in self.immutable_statuses:
            raise ValidationError("Apenas cirurgias realizadas podem ser encaminhadas para a enfermaria.")

        if not surgery.ward_referral_requested_at:
            surgery.ward_referral_requested_at = timezone.now()
            surgery.save(update_fields=["ward_referral_requested_at", "updated_at"])

        return Response(self.get_serializer(surgery).data)


class SurgeryViewSet(BaseSurgeryViewSet):
    queryset = Surgery.objects.select_related("patient", "surgical_request", "specialty", "surgeon", "operating_room").prefetch_related("procedures").all()
    serializer_class = SurgerySerializer
    filterset_class = SurgeryFilter


class SmallSurgeryViewSet(BaseSurgeryViewSet):
    queryset = SmallSurgery.objects.select_related("patient", "surgical_request", "specialty", "surgeon", "operating_room").prefetch_related("procedures").all()
    serializer_class = SmallSurgerySerializer
    filterset_class = SmallSurgeryFilter
    fixed_surgery_size = Surgery.Size.SMALL

    @action(detail=True, methods=["post"], url_path="sync-consumptions", url_name="sync-consumptions")
    def sync_consumptions(self, request, pk=None):
        from api.v1.surgery.serializers import _sync_procedure_consumptions, SurgicalConsumptionSerializer
        instance = self.get_object()
        _sync_procedure_consumptions(instance)
        consumptions = instance.consumptions.select_related("product").order_by("-consumed_at")
        serializer = SurgicalConsumptionSerializer(consumptions, many=True, context={"request": request})
        return Response(serializer.data)


class LargeSurgeryViewSet(BaseSurgeryViewSet):
    queryset = LargeSurgery.objects.select_related("patient", "surgical_request", "specialty", "surgeon", "operating_room").prefetch_related("procedures").all()
    serializer_class = LargeSurgerySerializer
    filterset_class = LargeSurgeryFilter
    fixed_surgery_size = Surgery.Size.LARGE

    @action(detail=True, methods=["post"], url_path="sync-consumptions", url_name="sync-consumptions")
    def sync_consumptions(self, request, pk=None):
        from api.v1.surgery.serializers import _sync_procedure_consumptions, SurgicalConsumptionSerializer
        instance = self.get_object()
        _sync_procedure_consumptions(instance)
        consumptions = instance.consumptions.select_related("product").order_by("-consumed_at")
        serializer = SurgicalConsumptionSerializer(consumptions, many=True, context={"request": request})
        return Response(serializer.data)


class SurgicalProcedureViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SurgicalProcedure.objects.all()
    serializer_class = SurgicalProcedureSerializer
    filterset_class = SurgicalProcedureFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "description"]
    ordering_fields = ["name", "active", "created_at"]
    ordering = ["name"]


def _surgery_as_drf_error(exc: DjangoValidationError) -> ValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return ValidationError(detail)


class SurgicalRequestViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SurgicalRequest.objects.select_related("patient", "requesting_doctor", "specialty").all()
    serializer_class = SurgicalRequestSerializer
    filterset_class = SurgicalRequestFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "requesting_doctor__name",
        "specialty__name",
        "clinical_diagnosis",
        "icd_code",
        "requested_procedure",
        "notes",
    ]
    ordering_fields = "__all__"
    ordering = ["-created_at"]

    def _run(self, request, method, **kwargs):
        obj = self.get_object()
        try:
            getattr(obj, method)(**kwargs)
        except DjangoValidationError as exc:
            raise _surgery_as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="submeter", url_name="submeter")
    def submeter(self, request, pk=None):
        return self._run(request, "submit")

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        return self._run(request, "approve")

    @action(detail=True, methods=["post"], url_path="rejeitar", url_name="rejeitar")
    def rejeitar(self, request, pk=None):
        return self._run(request, "reject", reason=request.data.get("reason", ""))

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        return self._run(request, "cancel", reason=request.data.get("reason", ""))


class PreoperativeAssessmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PreoperativeAssessment.objects.select_related(
        "patient",
        "surgical_request",
        "proposed_surgery",
        "evaluator",
    ).all()
    serializer_class = PreoperativeAssessmentSerializer
    filterset_class = PreoperativeAssessmentFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "surgical_request__custom_id",
        "proposed_surgery__custom_id",
        "evaluator__name",
        "medical_evaluation",
        "anesthetic_evaluation",
        "surgical_risk",
        "observations",
    ]
    ordering_fields = "__all__"
    ordering = ["-assessed_at", "-created_at"]


class SurgeryOperationsViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class OperatingRoomViewSet(SurgeryOperationsViewSet):
    queryset = OperatingRoom.objects.all()
    serializer_class = OperatingRoomSerializer
    filterset_class = OperatingRoomFilter
    search_fields = ["custom_id", "code", "name", "location", "notes"]
    ordering = ["name", "code"]


class SurgicalScheduleViewSet(SurgeryOperationsViewSet):
    queryset = SurgicalSchedule.objects.select_related(
        "surgery",
        "surgery__patient",
        "operating_room",
        "primary_surgeon",
        "anesthetist",
    ).all()
    serializer_class = SurgicalScheduleSerializer
    filterset_class = SurgicalScheduleFilter
    search_fields = [
        "custom_id",
        "surgery__custom_id",
        "surgery__patient__name",
        "operating_room__name",
        "primary_surgeon__name",
        "anesthetist__name",
        "notes",
    ]
    ordering = ["-scheduled_start", "-created_at"]


class SurgicalTeamMemberViewSet(SurgeryOperationsViewSet):
    queryset = SurgicalTeamMember.objects.select_related("surgery", "surgery__patient", "employee").all()
    serializer_class = SurgicalTeamMemberSerializer
    filterset_class = SurgicalTeamMemberFilter
    search_fields = ["custom_id", "surgery__custom_id", "surgery__patient__name", "employee__name", "role", "notes"]
    ordering = ["surgery", "role", "id"]


class AnesthesiaRecordViewSet(SurgeryOperationsViewSet):
    queryset = AnesthesiaRecord.objects.select_related("surgery", "surgery__patient", "anesthetist").all()
    serializer_class = AnesthesiaRecordSerializer
    filterset_class = AnesthesiaRecordFilter
    search_fields = ["custom_id", "surgery__custom_id", "surgery__patient__name", "anesthetist__name", "airway_management", "complications", "notes"]
    ordering = ["-started_at", "-created_at"]


class SurgicalSafetyChecklistViewSet(SurgeryOperationsViewSet):
    queryset = SurgicalSafetyChecklist.objects.select_related("surgery", "surgery__patient", "completed_by").all()
    serializer_class = SurgicalSafetyChecklistSerializer
    filterset_class = SurgicalSafetyChecklistFilter
    search_fields = ["custom_id", "surgery__custom_id", "surgery__patient__name", "completed_by__name", "notes"]
    ordering = ["surgery", "phase", "created_at"]


class SurgicalMaterialViewSet(SurgeryOperationsViewSet):
    queryset = SurgicalMaterial.objects.select_related("product").all()
    serializer_class = SurgicalMaterialSerializer
    filterset_class = SurgicalMaterialFilter
    search_fields = ["custom_id", "code", "name", "product__name", "notes"]
    ordering = ["name", "code"]


class SurgicalConsumptionViewSet(SurgeryOperationsViewSet):
    queryset = SurgicalConsumption.objects.select_related("surgery", "surgery__patient", "material", "product", "consumed_by").all()
    serializer_class = SurgicalConsumptionSerializer
    filterset_class = SurgicalConsumptionFilter
    search_fields = ["custom_id", "surgery__custom_id", "surgery__patient__name", "material__name", "product__name", "batch_number", "notes"]
    ordering = ["-consumed_at", "-created_at"]


class RecoveryRecordViewSet(SurgeryOperationsViewSet):
    queryset = RecoveryRecord.objects.select_related("surgery", "surgery__patient", "nurse").all()
    serializer_class = RecoveryRecordSerializer
    filterset_class = RecoveryRecordFilter
    search_fields = ["custom_id", "surgery__custom_id", "surgery__patient__name", "nurse__name", "destination", "complications", "notes"]
    ordering = ["-admitted_at", "-created_at"]


class OperativeReportViewSet(SurgeryOperationsViewSet):
    queryset = OperativeReport.objects.select_related("surgery", "surgery__patient", "primary_surgeon").all()
    serializer_class = OperativeReportSerializer
    filterset_class = OperativeReportFilter
    search_fields = ["custom_id", "surgery__custom_id", "surgery__patient__name", "primary_surgeon__name", "procedure_performed", "findings", "pathology_accession_number"]
    ordering = ["-signed_at", "-created_at"]


class SurgeryProcedureItemViewSet(SurgeryOperationsViewSet):
    queryset = SurgeryProcedureItem.objects.select_related(
        "surgery",
        "surgery__patient",
        "procedure",
        "responsible_surgeon",
    ).all()
    serializer_class = SurgeryProcedureItemSerializer
    filterset_class = SurgeryProcedureItemFilter
    search_fields = [
        "custom_id",
        "surgery__custom_id",
        "surgery__patient__name",
        "procedure__name",
        "description",
        "anatomical_region",
        "responsible_surgeon__name",
        "notes",
    ]
    ordering = ["surgery", "sequence", "id"]


class SurgicalAuthorizationViewSet(SurgeryOperationsViewSet):
    queryset = SurgicalAuthorization.objects.select_related(
        "patient",
        "surgery",
        "surgical_request",
        "preoperative_assessment",
    ).all()
    serializer_class = SurgicalAuthorizationSerializer
    filterset_class = SurgicalAuthorizationFilter
    search_fields = [
        "custom_id",
        "patient__name",
        "surgery__custom_id",
        "surgical_request__custom_id",
        "notes",
        "rejected_reason",
    ]
    ordering = ["-created_at"]


class SurgicalBillingItemViewSet(SurgeryOperationsViewSet):
    queryset = SurgicalBillingItem.objects.select_related(
        "surgery",
        "surgery__patient",
        "authorization",
        "procedure_item",
        "consumption",
        "invoice",
    ).all()
    serializer_class = SurgicalBillingItemSerializer
    filterset_class = SurgicalBillingItemFilter
    search_fields = [
        "custom_id",
        "surgery__custom_id",
        "surgery__patient__name",
        "description",
        "notes",
    ]
    ordering = ["surgery", "event_type", "id"]


class SurgicalDocumentViewSet(SurgeryOperationsViewSet):
    queryset = SurgicalDocument.objects.select_related(
        "surgery",
        "surgical_request",
        "preoperative_assessment",
        "authorization",
        "uploaded_by",
    ).all()
    serializer_class = SurgicalDocumentSerializer
    filterset_class = SurgicalDocumentFilter
    search_fields = [
        "custom_id",
        "title",
        "surgery__custom_id",
        "surgical_request__custom_id",
        "external_reference",
        "notes",
    ]
    ordering = ["-created_at"]


class SurgicalAuditEventViewSet(SurgeryOperationsViewSet):
    queryset = SurgicalAuditEvent.objects.select_related("surgery", "surgical_request", "actor").all()
    serializer_class = SurgicalAuditEventSerializer
    filterset_class = SurgicalAuditEventFilter
    search_fields = [
        "custom_id",
        "action",
        "surgery__custom_id",
        "surgical_request__custom_id",
        "actor__name",
        "notes",
    ]
    ordering = ["-occurred_at", "-created_at"]


class SurgicalSpecimenViewSet(SurgeryOperationsViewSet):
    queryset = SurgicalSpecimen.objects.select_related(
        "surgery",
        "surgery__patient",
        "patient",
        "responsible",
        "pathology_request",
    ).all()
    serializer_class = SurgicalSpecimenSerializer
    filterset_class = SurgicalSpecimenFilter
    search_fields = [
        "custom_id",
        "surgery__custom_id",
        "patient__name",
        "specimen_type",
        "anatomical_site",
        "fixative",
        "notes",
    ]
    ordering = ["-collected_at", "-created_at"]


VIEWSET_MAP = {
    "pedido_cirurgico": SurgicalRequestViewSet,
    "avaliacao_pre_operatoria": PreoperativeAssessmentViewSet,
    "surgery": SurgeryViewSet,
    "small_surgery": SmallSurgeryViewSet,
    "large_surgery": LargeSurgeryViewSet,
    "surgical_procedure": SurgicalProcedureViewSet,
    "procedimentos_realizados": SurgeryProcedureItemViewSet,
    "agenda_cirurgica": SurgicalScheduleViewSet,
    "centro_cirurgico": OperatingRoomViewSet,
    "equipa_cirurgica": SurgicalTeamMemberViewSet,
    "anestesia": AnesthesiaRecordViewSet,
    "checklist_seguranca": SurgicalSafetyChecklistViewSet,
    "materiais": SurgicalMaterialViewSet,
    "consumos": SurgicalConsumptionViewSet,
    "recuperacao": RecoveryRecordViewSet,
    "relatorio_operatorio": OperativeReportViewSet,
    "autorizacoes": SurgicalAuthorizationViewSet,
    "faturacao": SurgicalBillingItemViewSet,
    "documentos": SurgicalDocumentViewSet,
    "auditoria": SurgicalAuditEventViewSet,
    "amostras": SurgicalSpecimenViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "AnesthesiaRecordViewSet",
    "BaseSurgeryViewSet",
    "LargeSurgeryViewSet",
    "OperatingRoomViewSet",
    "OperativeReportViewSet",
    "PreoperativeAssessmentViewSet",
    "RecoveryRecordViewSet",
    "SmallSurgeryViewSet",
    "SurgeryOperationsViewSet",
    "SurgeryProcedureItemViewSet",
    "SurgeryViewSet",
    "SurgicalAuditEventViewSet",
    "SurgicalAuthorizationViewSet",
    "SurgicalBillingItemViewSet",
    "SurgicalConsumptionViewSet",
    "SurgicalDocumentViewSet",
    "SurgicalMaterialViewSet",
    "SurgicalProcedureViewSet",
    "SurgicalRequestViewSet",
    "SurgicalSafetyChecklistViewSet",
    "SurgicalScheduleViewSet",
    "SurgicalSpecimenViewSet",
    "SurgicalTeamMemberViewSet",
]
