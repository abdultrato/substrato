from api.core.filters import SafeFilterSet
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


class DentalProcedureFilter(SafeFilterSet):
    class Meta:
        model = DentalProcedure
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "code",
            "category",
            "requires_prosthesis_lab",
            "active",
            "created_at",
        ]


class DentalAppointmentFilter(SafeFilterSet):
    class Meta:
        model = DentalAppointment
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "dentist",
            "consultation",
            "status",
            "scheduled_start",
            "scheduled_end",
            "created_at",
        ]


class DentalRecordFilter(SafeFilterSet):
    class Meta:
        model = DentalRecord
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "dentist",
            "appointment",
            "status",
            "opened_at",
            "closed_at",
            "created_at",
        ]


class DentalConsultationFilter(SafeFilterSet):
    class Meta:
        model = DentalConsultation
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "dentist",
            "appointment",
            "record",
            "status",
            "started_at",
            "ended_at",
            "created_at",
        ]


class DentalOdontogramFilter(SafeFilterSet):
    class Meta:
        model = DentalOdontogram
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "consultation",
            "record",
            "created_by_dentist",
            "dentition_type",
            "status",
            "charted_at",
            "created_at",
        ]


class DentalOdontogramEntryFilter(SafeFilterSet):
    class Meta:
        model = DentalOdontogramEntry
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "odontogram",
            "record",
            "tooth_number",
            "surface",
            "condition",
            "severity",
            "status",
            "procedure",
            "created_at",
        ]


class DentalDiagnosisFilter(SafeFilterSet):
    class Meta:
        model = DentalDiagnosis
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "consultation",
            "record",
            "odontogram_entry",
            "tooth_number",
            "code",
            "severity",
            "responsible_dentist",
            "diagnosed_at",
            "created_at",
        ]


class DentalTreatmentPlanFilter(SafeFilterSet):
    class Meta:
        model = DentalTreatmentPlan
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "dentist",
            "record",
            "status",
            "priority",
            "planned_start",
            "planned_end",
            "requires_initial_payment",
            "created_at",
        ]


class DentalTreatmentPhaseFilter(SafeFilterSet):
    class Meta:
        model = DentalTreatmentPhase
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "treatment_plan",
            "phase_type",
            "status",
            "planned_start",
            "planned_end",
            "created_at",
        ]


class DentalTreatmentPlanItemFilter(SafeFilterSet):
    class Meta:
        model = DentalTreatmentPlanItem
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "treatment_plan",
            "procedure",
            "appointment",
            "tooth_number",
            "status",
            "financial_status",
            "scheduled_date",
            "lab_required",
            "created_at",
        ]


class DentalPatientTreatmentPlanFilter(SafeFilterSet):
    class Meta:
        model = DentalPatientTreatmentPlan
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "treatment_plan",
            "dentist",
            "record",
            "status",
            "assigned_at",
            "valid_from",
            "valid_until",
            "created_at",
        ]


class DentalProsthesisLabOrderFilter(SafeFilterSet):
    class Meta:
        model = DentalProsthesisLabOrder
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "dentist",
            "treatment_item",
            "procedure_execution",
            "lab_company",
            "prosthesis_type",
            "status",
            "due_date",
            "created_at",
        ]


class DentalQuotationFilter(SafeFilterSet):
    class Meta:
        model = DentalQuotation
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "treatment_plan",
            "patient",
            "issued_by",
            "status",
            "issued_at",
            "valid_until",
            "created_at",
        ]


class DentalApprovalFilter(SafeFilterSet):
    class Meta:
        model = DentalApproval
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "treatment_plan",
            "quotation",
            "patient",
            "approval_scope",
            "approved_at",
            "consent_signed",
            "created_at",
        ]


class DentalPaymentFilter(SafeFilterSet):
    class Meta:
        model = DentalPayment
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "treatment_plan",
            "treatment_item",
            "quotation",
            "payment",
            "payment_kind",
            "status",
            "due_date",
            "paid_at",
            "created_at",
        ]


class DentalProcedureExecutionFilter(SafeFilterSet):
    class Meta:
        model = DentalProcedureExecution
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "consultation",
            "treatment_plan",
            "treatment_item",
            "appointment",
            "procedure",
            "performed_by",
            "tooth_number",
            "status",
            "scheduled_at",
            "performed_at",
            "created_at",
        ]


class DentalImagingOrderFilter(SafeFilterSet):
    class Meta:
        model = DentalImagingOrder
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "dentist",
            "consultation",
            "record",
            "treatment_item",
            "procedure_execution",
            "imaging_type",
            "status",
            "requested_at",
            "scheduled_at",
            "acquired_at",
            "created_at",
        ]


class DentalPrescriptionFilter(SafeFilterSet):
    class Meta:
        model = DentalPrescription
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "dentist",
            "consultation",
            "record",
            "procedure_execution",
            "medication_product",
            "status",
            "prescribed_at",
            "created_at",
        ]


class DentalFollowUpFilter(SafeFilterSet):
    class Meta:
        model = DentalFollowUp
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "procedure_execution",
            "appointment",
            "treatment_plan",
            "status",
            "due_date",
            "completed_at",
            "created_at",
        ]


class DentalMaterialConsumptionFilter(SafeFilterSet):
    class Meta:
        model = DentalMaterialConsumption
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "procedure_execution",
            "product",
            "warehouse_item",
            "inventory_movement",
            "material_name",
            "consumed_at",
            "created_at",
        ]


class DentalClinicalEvolutionFilter(SafeFilterSet):
    class Meta:
        model = DentalClinicalEvolution
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "record",
            "consultation",
            "procedure_execution",
            "treatment_plan",
            "dentist",
            "evolved_at",
            "created_at",
        ]


class DentalDocumentFilter(SafeFilterSet):
    class Meta:
        model = DentalDocument
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "consultation",
            "record",
            "treatment_plan",
            "document_type",
            "signed",
            "signed_at",
            "created_at",
        ]


class DentalAuditEventFilter(SafeFilterSet):
    class Meta:
        model = DentalAuditEvent
        fields = ["tenant", "custom_id", "deleted", "patient", "treatment_plan", "event_type", "event_at", "created_at"]


class DentalBillingItemFilter(SafeFilterSet):
    class Meta:
        model = DentalBillingItem
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "treatment_plan",
            "treatment_item",
            "procedure_execution",
            "quotation",
            "invoice",
            "invoice_item",
            "status",
            "billable_at",
            "billed_at",
            "created_at",
        ]


class PatientDentalPlanSummaryFilter(SafeFilterSet):
    class Meta:
        model = PatientDentalPlanSummary
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "active_plan",
            "next_appointment",
            "plan_status",
            "generated_at",
            "created_at",
        ]


FILTER_MAP = {
    "procedure": DentalProcedureFilter,
    "appointment": DentalAppointmentFilter,
    "consultation": DentalConsultationFilter,
    "record": DentalRecordFilter,
    "odontogram_chart": DentalOdontogramFilter,
    "odontogram": DentalOdontogramEntryFilter,
    "diagnosis": DentalDiagnosisFilter,
    "treatment_plan": DentalTreatmentPlanFilter,
    "treatment_phase": DentalTreatmentPhaseFilter,
    "treatment_item": DentalTreatmentPlanItemFilter,
    "patient_treatment_plan": DentalPatientTreatmentPlanFilter,
    "quotation": DentalQuotationFilter,
    "approval": DentalApprovalFilter,
    "payment": DentalPaymentFilter,
    "procedure_execution": DentalProcedureExecutionFilter,
    "prosthesis_lab_order": DentalProsthesisLabOrderFilter,
    "imaging_order": DentalImagingOrderFilter,
    "prescription": DentalPrescriptionFilter,
    "followup": DentalFollowUpFilter,
    "material_consumption": DentalMaterialConsumptionFilter,
    "clinical_evolution": DentalClinicalEvolutionFilter,
    "document": DentalDocumentFilter,
    "audit_event": DentalAuditEventFilter,
    "billing_item": DentalBillingItemFilter,
    "patient_plan_summary": PatientDentalPlanSummaryFilter,
}
