from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.dental.models import (
    DentalAppointment,
    DentalApproval,
    DentalAuditEvent,
    DentalBillingItem,
    DentalClinicalEvolution,
    DentalConsultation,
    DentalDiagnosis,
    DentalDocument,
    DentalFollowUp,
    DentalImagingOrder,
    DentalMaterialConsumption,
    DentalOdontogram,
    DentalOdontogramEntry,
    DentalPatientTreatmentPlan,
    DentalPayment,
    DentalPrescription,
    DentalProcedure,
    DentalProcedureExecution,
    DentalProsthesisLabOrder,
    DentalQuotation,
    DentalRecord,
    DentalTreatmentPhase,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
    PatientDentalPlanSummary,
)

from .filters import (
    DentalAppointmentFilter,
    DentalApprovalFilter,
    DentalAuditEventFilter,
    DentalBillingItemFilter,
    DentalClinicalEvolutionFilter,
    DentalConsultationFilter,
    DentalDiagnosisFilter,
    DentalDocumentFilter,
    DentalFollowUpFilter,
    DentalImagingOrderFilter,
    DentalMaterialConsumptionFilter,
    DentalOdontogramEntryFilter,
    DentalOdontogramFilter,
    DentalPatientTreatmentPlanFilter,
    DentalPaymentFilter,
    DentalPrescriptionFilter,
    DentalProcedureExecutionFilter,
    DentalProcedureFilter,
    DentalProsthesisLabOrderFilter,
    DentalQuotationFilter,
    DentalRecordFilter,
    DentalTreatmentPhaseFilter,
    DentalTreatmentPlanFilter,
    DentalTreatmentPlanItemFilter,
    PatientDentalPlanSummaryFilter,
)
from .serializers import (
    DentalAppointmentSerializer,
    DentalApprovalSerializer,
    DentalAuditEventSerializer,
    DentalBillingItemSerializer,
    DentalClinicalEvolutionSerializer,
    DentalConsultationSerializer,
    DentalDiagnosisSerializer,
    DentalDocumentSerializer,
    DentalFollowUpSerializer,
    DentalImagingOrderSerializer,
    DentalMaterialConsumptionSerializer,
    DentalOdontogramEntrySerializer,
    DentalOdontogramSerializer,
    DentalPatientTreatmentPlanSerializer,
    DentalPaymentSerializer,
    DentalPrescriptionSerializer,
    DentalProcedureExecutionSerializer,
    DentalProcedureSerializer,
    DentalProsthesisLabOrderSerializer,
    DentalQuotationSerializer,
    DentalRecordSerializer,
    DentalTreatmentPhaseSerializer,
    DentalTreatmentPlanItemSerializer,
    DentalTreatmentPlanSerializer,
    PatientDentalPlanSummarySerializer,
)


def _filter_patient_plan_validity(queryset, validity: str):
    today = timezone.localdate()
    normalized = (validity or "").strip().lower()
    if normalized in {"valid", "validos", "válidos", "valido", "válido"}:
        return queryset.filter(
            status=DentalPatientTreatmentPlan.Status.ACTIVE,
            valid_from__lte=today,
        ).filter(Q(valid_until__isnull=True) | Q(valid_until__gte=today))
    if normalized in {"expired", "expirados", "expirado"}:
        return queryset.filter(Q(status=DentalPatientTreatmentPlan.Status.EXPIRED) | Q(valid_until__lt=today))
    return queryset


class DentalProcedureViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalProcedure.objects.all()
    serializer_class = DentalProcedureSerializer
    filterset_class = DentalProcedureFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "code", "name", "category", "notes"]
    ordering_fields = ["code", "name", "category", "base_price", "default_duration_minutes", "active", "created_at"]
    ordering = ["name", "code"]


class DentalAppointmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalAppointment.objects.select_related("patient", "dentist", "consultation").all()
    serializer_class = DentalAppointmentSerializer
    filterset_class = DentalAppointmentFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "dentist__name",
        "reason",
        "chair",
        "notes",
    ]
    ordering_fields = ["scheduled_start", "scheduled_end", "status", "patient", "dentist", "created_at"]
    ordering = ["-scheduled_start", "-created_at"]


class DentalRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = (
        DentalRecord.objects.select_related("patient", "dentist", "appointment")
        .prefetch_related("odontogram_entries")
        .all()
    )
    serializer_class = DentalRecordSerializer
    filterset_class = DentalRecordFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "dentist__name",
        "chief_complaint",
        "dental_history",
        "diagnosis",
        "treatment_summary",
        "notes",
    ]
    ordering_fields = ["opened_at", "closed_at", "status", "patient", "dentist", "created_at"]
    ordering = ["-opened_at", "-created_at"]


class DentalConsultationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalConsultation.objects.select_related("patient", "dentist", "appointment", "record").all()
    serializer_class = DentalConsultationSerializer
    filterset_class = DentalConsultationFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "dentist__name",
        "chief_complaint",
        "present_illness_history",
        "clinical_observations",
    ]
    ordering_fields = ["started_at", "ended_at", "status", "patient", "dentist", "created_at"]
    ordering = ["-started_at", "-created_at"]


class DentalOdontogramViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = (
        DentalOdontogram.objects.select_related(
            "patient",
            "consultation",
            "record",
            "created_by_dentist",
        )
        .prefetch_related("entries")
        .all()
    )
    serializer_class = DentalOdontogramSerializer
    filterset_class = DentalOdontogramFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "record__custom_id", "dentition_type", "status", "notes"]
    ordering_fields = ["charted_at", "dentition_type", "status", "patient", "created_at"]
    ordering = ["-charted_at", "-created_at"]


class DentalOdontogramEntryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalOdontogramEntry.objects.select_related(
        "odontogram", "record", "record__patient", "procedure"
    ).all()
    serializer_class = DentalOdontogramEntrySerializer
    filterset_class = DentalOdontogramEntryFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "record__custom_id",
        "record__patient__name",
        "tooth_number",
        "condition",
        "diagnosis",
        "procedure_suggested",
        "notes",
    ]
    ordering_fields = ["record", "tooth_number", "surface", "condition", "severity", "status", "created_at"]
    ordering = ["record", "tooth_number", "surface", "id"]


class DentalDiagnosisViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalDiagnosis.objects.select_related(
        "patient",
        "consultation",
        "record",
        "odontogram_entry",
        "responsible_dentist",
    ).all()
    serializer_class = DentalDiagnosisSerializer
    filterset_class = DentalDiagnosisFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "diagnosis", "code", "tooth_number", "notes"]
    ordering_fields = ["diagnosed_at", "severity", "patient", "responsible_dentist", "created_at"]
    ordering = ["-diagnosed_at", "-created_at"]


class DentalTreatmentPlanViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = (
        DentalTreatmentPlan.objects.select_related("patient", "dentist", "record")
        .prefetch_related(
            "phases",
            "items",
            "patient_assignments",
        )
        .all()
    )
    serializer_class = DentalTreatmentPlanSerializer
    filterset_class = DentalTreatmentPlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "title", "patient__name", "dentist__name", "objectives", "notes"]
    ordering_fields = [
        "planned_start",
        "planned_end",
        "priority",
        "status",
        "estimated_total",
        "approved_amount",
        "patient",
        "dentist",
        "created_at",
    ]
    ordering = ["-created_at"]


class DentalTreatmentPhaseViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalTreatmentPhase.objects.select_related("treatment_plan").all()
    serializer_class = DentalTreatmentPhaseSerializer
    filterset_class = DentalTreatmentPhaseFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "title", "treatment_plan__title", "phase_type", "status", "notes"]
    ordering_fields = [
        "position",
        "planned_start",
        "planned_end",
        "phase_type",
        "status",
        "estimated_amount",
        "created_at",
    ]
    ordering = ["treatment_plan", "position", "id"]


class DentalTreatmentPlanItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalTreatmentPlanItem.objects.select_related(
        "treatment_plan",
        "phase",
        "procedure",
        "appointment",
    ).all()
    serializer_class = DentalTreatmentPlanItemSerializer
    filterset_class = DentalTreatmentPlanItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "treatment_plan__title",
        "phase__title",
        "procedure__name",
        "tooth_number",
        "clinical_notes",
    ]
    ordering_fields = [
        "position",
        "scheduled_date",
        "completed_at",
        "status",
        "financial_status",
        "quantity",
        "unit_price",
        "created_at",
    ]
    ordering = ["treatment_plan", "position", "id"]


class DentalPatientTreatmentPlanViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = (
        DentalPatientTreatmentPlan.objects.select_related(
            "patient",
            "treatment_plan",
            "dentist",
            "record",
        )
        .prefetch_related("treatment_plan__items")
        .all()
    )
    serializer_class = DentalPatientTreatmentPlanSerializer
    filterset_class = DentalPatientTreatmentPlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "treatment_plan__title",
        "dentist__name",
        "notes",
    ]
    ordering_fields = [
        "assigned_at",
        "valid_from",
        "valid_until",
        "status",
        "patient",
        "treatment_plan",
        "dentist",
        "created_at",
    ]
    ordering = ["-valid_from", "-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        request = getattr(self, "request", None)
        validity = ""
        if request is not None:
            validity = request.query_params.get("validity", "")
        return _filter_patient_plan_validity(queryset, validity)

    @action(detail=False, methods=["get"], url_path="valid", url_name="valid")
    def valid(self, request):
        queryset = self.filter_queryset(_filter_patient_plan_validity(super().get_queryset(), "valid"))
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"], url_path="expired", url_name="expired")
    def expired(self, request):
        queryset = self.filter_queryset(_filter_patient_plan_validity(super().get_queryset(), "expired"))
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(queryset, many=True).data)


class DentalQuotationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalQuotation.objects.select_related("treatment_plan", "patient", "issued_by").all()
    serializer_class = DentalQuotationSerializer
    filterset_class = DentalQuotationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "treatment_plan__title", "patient__name", "payment_terms", "notes"]
    ordering_fields = ["issued_at", "valid_until", "status", "subtotal", "total_amount", "created_at"]
    ordering = ["-issued_at", "-created_at"]


class DentalApprovalViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalApproval.objects.select_related("treatment_plan", "quotation", "patient").all()
    serializer_class = DentalApprovalSerializer
    filterset_class = DentalApprovalFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "treatment_plan__title",
        "patient__name",
        "approved_by_name",
        "accepted_terms",
        "notes",
    ]
    ordering_fields = ["approved_at", "approval_scope", "approved_amount", "consent_signed", "created_at"]
    ordering = ["-approved_at", "-created_at"]


class DentalPaymentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalPayment.objects.select_related(
        "patient",
        "treatment_plan",
        "treatment_item",
        "quotation",
        "payment",
    ).all()
    serializer_class = DentalPaymentSerializer
    filterset_class = DentalPaymentFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "treatment_plan__title",
        "method",
        "external_reference",
        "notes",
    ]
    ordering_fields = ["due_date", "paid_at", "payment_kind", "status", "amount_due", "amount_paid", "created_at"]
    ordering = ["-due_date", "-created_at"]


class DentalProcedureExecutionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalProcedureExecution.objects.select_related(
        "patient",
        "consultation",
        "treatment_plan",
        "treatment_item",
        "appointment",
        "procedure",
        "performed_by",
    ).all()
    serializer_class = DentalProcedureExecutionSerializer
    filterset_class = DentalProcedureExecutionFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "procedure__name",
        "performed_by__name",
        "tooth_number",
        "materials_used",
        "clinical_notes",
    ]
    ordering_fields = ["scheduled_at", "started_at", "performed_at", "status", "patient", "procedure", "created_at"]
    ordering = ["-performed_at", "-scheduled_at", "-created_at"]


class DentalProsthesisLabOrderViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalProsthesisLabOrder.objects.select_related(
        "patient",
        "dentist",
        "treatment_item",
        "procedure_execution",
        "lab_company",
    ).all()
    serializer_class = DentalProsthesisLabOrderSerializer
    filterset_class = DentalProsthesisLabOrderFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "order_number",
        "patient__name",
        "dentist__name",
        "lab_company__name",
        "tooth_numbers",
        "shade",
        "material",
        "lab_notes",
    ]
    ordering_fields = [
        "created_at",
        "due_date",
        "sent_at",
        "received_at",
        "delivered_at",
        "installed_at",
        "status",
        "cost",
        "patient_price",
    ]
    ordering = ["-created_at"]


class DentalImagingOrderViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalImagingOrder.objects.select_related(
        "patient",
        "dentist",
        "consultation",
        "record",
        "treatment_item",
        "procedure_execution",
    ).all()
    serializer_class = DentalImagingOrderSerializer
    filterset_class = DentalImagingOrderFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "dentist__name",
        "clinical_indication",
        "result_summary",
        "image_reference",
        "notes",
    ]
    ordering_fields = [
        "requested_at",
        "scheduled_at",
        "acquired_at",
        "reviewed_at",
        "imaging_type",
        "status",
        "created_at",
    ]
    ordering = ["-requested_at", "-created_at"]


class DentalPrescriptionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalPrescription.objects.select_related(
        "patient",
        "dentist",
        "consultation",
        "record",
        "procedure_execution",
        "medication_product",
    ).all()
    serializer_class = DentalPrescriptionSerializer
    filterset_class = DentalPrescriptionFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "dentist__name",
        "medication",
        "dose",
        "frequency",
        "instructions",
        "notes",
    ]
    ordering_fields = ["prescribed_at", "status", "patient", "dentist", "created_at"]
    ordering = ["-prescribed_at", "-created_at"]


class DentalFollowUpViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalFollowUp.objects.select_related(
        "patient",
        "procedure_execution",
        "appointment",
        "treatment_plan",
    ).all()
    serializer_class = DentalFollowUpSerializer
    filterset_class = DentalFollowUpFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "followup_reason", "findings", "notes"]
    ordering_fields = ["due_date", "completed_at", "status", "patient", "created_at"]
    ordering = ["due_date", "-created_at"]


class DentalMaterialConsumptionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalMaterialConsumption.objects.select_related(
        "procedure_execution",
        "product",
        "warehouse_item",
        "inventory_movement",
    ).all()
    serializer_class = DentalMaterialConsumptionSerializer
    filterset_class = DentalMaterialConsumptionFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "procedure_execution__custom_id",
        "material_name",
        "product__name",
        "warehouse_item__name",
        "notes",
    ]
    ordering_fields = ["consumed_at", "material_name", "quantity", "unit_cost", "created_at"]
    ordering = ["-consumed_at", "-created_at"]


class DentalClinicalEvolutionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalClinicalEvolution.objects.select_related(
        "patient",
        "record",
        "consultation",
        "procedure_execution",
        "treatment_plan",
        "dentist",
    ).all()
    serializer_class = DentalClinicalEvolutionSerializer
    filterset_class = DentalClinicalEvolutionFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "dentist__name", "summary", "next_steps", "notes"]
    ordering_fields = ["evolved_at", "patient", "dentist", "created_at"]
    ordering = ["-evolved_at", "-created_at"]


class DentalDocumentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalDocument.objects.select_related("patient", "consultation", "record", "treatment_plan").all()
    serializer_class = DentalDocumentSerializer
    filterset_class = DentalDocumentFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "title", "file_reference", "notes"]
    ordering_fields = ["created_at", "document_type", "signed", "signed_at", "patient"]
    ordering = ["-created_at"]


class DentalAuditEventViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalAuditEvent.objects.select_related("patient", "treatment_plan").all()
    serializer_class = DentalAuditEventSerializer
    filterset_class = DentalAuditEventFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "event_type", "actor_name", "summary", "patient__name", "treatment_plan__title"]
    ordering_fields = ["event_at", "event_type", "patient", "created_at"]
    ordering = ["-event_at", "-created_at"]


class DentalBillingItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalBillingItem.objects.select_related(
        "patient",
        "treatment_plan",
        "treatment_item",
        "procedure_execution",
        "quotation",
        "invoice",
        "invoice_item",
    ).all()
    serializer_class = DentalBillingItemSerializer
    filterset_class = DentalBillingItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "description", "notes"]
    ordering_fields = ["billable_at", "billed_at", "status", "quantity", "unit_price", "created_at"]
    ordering = ["-billable_at", "-created_at"]


class PatientDentalPlanSummaryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PatientDentalPlanSummary.objects.select_related("patient", "active_plan", "next_appointment").all()
    serializer_class = PatientDentalPlanSummarySerializer
    filterset_class = PatientDentalPlanSummaryFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "active_plan__title", "plan_status", "notes"]
    ordering_fields = [
        "generated_at",
        "plan_status",
        "total_planned_amount",
        "total_paid",
        "balance_amount",
        "created_at",
    ]
    ordering = ["-generated_at", "-created_at"]


VIEWSET_MAP = {
    "procedure": DentalProcedureViewSet,
    "appointment": DentalAppointmentViewSet,
    "consultation": DentalConsultationViewSet,
    "record": DentalRecordViewSet,
    "odontogram_chart": DentalOdontogramViewSet,
    "odontogram": DentalOdontogramEntryViewSet,
    "diagnosis": DentalDiagnosisViewSet,
    "treatment_plan": DentalTreatmentPlanViewSet,
    "treatment_phase": DentalTreatmentPhaseViewSet,
    "treatment_item": DentalTreatmentPlanItemViewSet,
    "patient_treatment_plan": DentalPatientTreatmentPlanViewSet,
    "quotation": DentalQuotationViewSet,
    "approval": DentalApprovalViewSet,
    "payment": DentalPaymentViewSet,
    "procedure_execution": DentalProcedureExecutionViewSet,
    "prosthesis_lab_order": DentalProsthesisLabOrderViewSet,
    "imaging_order": DentalImagingOrderViewSet,
    "prescription": DentalPrescriptionViewSet,
    "followup": DentalFollowUpViewSet,
    "material_consumption": DentalMaterialConsumptionViewSet,
    "clinical_evolution": DentalClinicalEvolutionViewSet,
    "document": DentalDocumentViewSet,
    "audit_event": DentalAuditEventViewSet,
    "billing_item": DentalBillingItemViewSet,
    "patient_plan_summary": PatientDentalPlanSummaryViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "DentalAppointmentViewSet",
    "DentalApprovalViewSet",
    "DentalAuditEventViewSet",
    "DentalBillingItemViewSet",
    "DentalClinicalEvolutionViewSet",
    "DentalConsultationViewSet",
    "DentalDiagnosisViewSet",
    "DentalDocumentViewSet",
    "DentalFollowUpViewSet",
    "DentalImagingOrderViewSet",
    "DentalMaterialConsumptionViewSet",
    "DentalOdontogramEntryViewSet",
    "DentalOdontogramViewSet",
    "DentalPatientTreatmentPlanViewSet",
    "DentalPaymentViewSet",
    "DentalPrescriptionViewSet",
    "DentalProcedureExecutionViewSet",
    "DentalProcedureViewSet",
    "DentalProsthesisLabOrderViewSet",
    "DentalQuotationViewSet",
    "DentalRecordViewSet",
    "DentalTreatmentPhaseViewSet",
    "DentalTreatmentPlanItemViewSet",
    "DentalTreatmentPlanViewSet",
    "PatientDentalPlanSummaryViewSet",
]
