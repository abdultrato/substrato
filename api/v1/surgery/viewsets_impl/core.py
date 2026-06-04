"""ViewSets da API v1 para cirurgias, bloco operatório e catálogo cirúrgico."""

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
    RecoveryRecord,
    SmallSurgery,
    Surgery,
    SurgicalConsumption,
    SurgicalMaterial,
    SurgicalProcedure,
    SurgicalSafetyChecklist,
    SurgicalSchedule,
    SurgicalTeamMember,
)

from ..filters import (
    AnesthesiaRecordFilter,
    LargeSurgeryFilter,
    OperatingRoomFilter,
    OperativeReportFilter,
    RecoveryRecordFilter,
    SmallSurgeryFilter,
    SurgeryFilter,
    SurgicalConsumptionFilter,
    SurgicalMaterialFilter,
    SurgicalProcedureFilter,
    SurgicalSafetyChecklistFilter,
    SurgicalScheduleFilter,
    SurgicalTeamMemberFilter,
)
from ..serializers import (
    AnesthesiaRecordSerializer,
    LargeSurgerySerializer,
    OperatingRoomSerializer,
    OperativeReportSerializer,
    RecoveryRecordSerializer,
    SmallSurgerySerializer,
    SurgerySerializer,
    SurgicalConsumptionSerializer,
    SurgicalMaterialSerializer,
    SurgicalProcedureSerializer,
    SurgicalSafetyChecklistSerializer,
    SurgicalScheduleSerializer,
    SurgicalTeamMemberSerializer,
)


class BaseSurgeryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    fixed_surgery_size: str | None = None
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "procedure", "patient__name", "surgeon__username", "surgery_size"]
    ordering_fields = ["scheduled_for", "created_at", "status", "surgery_size"]
    ordering = ["-scheduled_for", "-created_at"]

    def perform_create(self, serializer):
        if self.fixed_surgery_size:
            serializer.save(surgery_size=self.fixed_surgery_size)
            return
        serializer.save()

    def perform_update(self, serializer):
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


class SurgeryViewSet(BaseSurgeryViewSet):
    queryset = Surgery.objects.select_related("patient", "surgeon").prefetch_related("procedures").all()
    serializer_class = SurgerySerializer
    filterset_class = SurgeryFilter


class SmallSurgeryViewSet(BaseSurgeryViewSet):
    queryset = SmallSurgery.objects.select_related("patient", "surgeon").prefetch_related("procedures").all()
    serializer_class = SmallSurgerySerializer
    filterset_class = SmallSurgeryFilter
    fixed_surgery_size = Surgery.Size.SMALL


class LargeSurgeryViewSet(BaseSurgeryViewSet):
    queryset = LargeSurgery.objects.select_related("patient", "surgeon").prefetch_related("procedures").all()
    serializer_class = LargeSurgerySerializer
    filterset_class = LargeSurgeryFilter
    fixed_surgery_size = Surgery.Size.LARGE


class SurgicalProcedureViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SurgicalProcedure.objects.all()
    serializer_class = SurgicalProcedureSerializer
    filterset_class = SurgicalProcedureFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "description"]
    ordering_fields = ["name", "active", "created_at"]
    ordering = ["name"]


class SurgeryOperationsViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class OperatingRoomViewSet(SurgeryOperationsViewSet):
    queryset = OperatingRoom.objects.all()
    serializer_class = OperatingRoomSerializer
    filterset_class = OperatingRoomFilter
    search_fields = ["custom_id", "code", "name", "location", "equipment_notes", "notes"]
    ordering = ["name", "code"]


class SurgicalScheduleViewSet(SurgeryOperationsViewSet):
    queryset = SurgicalSchedule.objects.select_related("surgery", "surgery__patient", "operating_room").all()
    serializer_class = SurgicalScheduleSerializer
    filterset_class = SurgicalScheduleFilter
    search_fields = ["custom_id", "surgery__custom_id", "surgery__patient__name", "operating_room__name", "notes"]
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


VIEWSET_MAP = {
    "surgery": SurgeryViewSet,
    "small_surgery": SmallSurgeryViewSet,
    "large_surgery": LargeSurgeryViewSet,
    "surgical_procedure": SurgicalProcedureViewSet,
    "agenda_cirurgica": SurgicalScheduleViewSet,
    "centro_cirurgico": OperatingRoomViewSet,
    "equipa_cirurgica": SurgicalTeamMemberViewSet,
    "anestesia": AnesthesiaRecordViewSet,
    "checklist_seguranca": SurgicalSafetyChecklistViewSet,
    "materiais": SurgicalMaterialViewSet,
    "consumos": SurgicalConsumptionViewSet,
    "recuperacao": RecoveryRecordViewSet,
    "relatorio_operatorio": OperativeReportViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "AnesthesiaRecordViewSet",
    "BaseSurgeryViewSet",
    "LargeSurgeryViewSet",
    "OperatingRoomViewSet",
    "OperativeReportViewSet",
    "RecoveryRecordViewSet",
    "SmallSurgeryViewSet",
    "SurgeryOperationsViewSet",
    "SurgeryViewSet",
    "SurgicalConsumptionViewSet",
    "SurgicalMaterialViewSet",
    "SurgicalProcedureViewSet",
    "SurgicalSafetyChecklistViewSet",
    "SurgicalScheduleViewSet",
    "SurgicalTeamMemberViewSet",
]
