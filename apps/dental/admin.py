from django import forms
from django.contrib import admin

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

TOOTH_NUMBER_PLACEHOLDER = "Ex.: 11, 26, 48 ou 75"


class DentalOdontogramEntryAdminForm(forms.ModelForm):
    class Meta:
        model = DentalOdontogramEntry
        fields = "__all__"
        widgets = {
            "tooth_number": forms.TextInput(attrs={"placeholder": TOOTH_NUMBER_PLACEHOLDER}),
        }


class DentalCoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    readonly_fields = ("custom_id", "created_at", "updated_at")
    search_fields = ("custom_id",)
    ordering = ("-created_at",)


class DentalOdontogramInline(admin.TabularInline):
    model = DentalOdontogramEntry
    form = DentalOdontogramEntryAdminForm
    extra = 0
    autocomplete_fields = ("odontogram", "procedure")
    fields = (
        "odontogram",
        "tooth_number",
        "surface",
        "condition",
        "severity",
        "status",
        "procedure",
        "notes",
    )


class DentalTreatmentPhaseInline(admin.TabularInline):
    model = DentalTreatmentPhase
    extra = 0
    fields = (
        "position",
        "title",
        "phase_type",
        "status",
        "planned_start",
        "planned_end",
        "estimated_amount",
        "approved_amount",
    )


class DentalTreatmentPlanItemInline(admin.TabularInline):
    model = DentalTreatmentPlanItem
    extra = 0
    autocomplete_fields = ("phase", "procedure", "appointment")
    fields = (
        "position",
        "phase",
        "procedure",
        "tooth_number",
        "surface",
        "status",
        "financial_status",
        "scheduled_date",
        "quantity",
        "unit_price",
        "discount_amount",
        "lab_required",
    )


@admin.register(DentalProcedure)
class DentalProcedureAdmin(DentalCoreAdmin):
    list_display = (
        "code",
        "name",
        "category",
        "default_duration_minutes",
        "base_price",
        "requires_prosthesis_lab",
        "active",
    )
    list_filter = ("category", "requires_prosthesis_lab", "active", "deleted")
    search_fields = ("custom_id", "code", "name", "notes")


@admin.register(DentalAppointment)
class DentalAppointmentAdmin(DentalCoreAdmin):
    list_display = ("scheduled_start", "scheduled_end", "patient", "dentist", "status", "chair")
    list_filter = ("status", "deleted", "scheduled_start")
    search_fields = ("custom_id", "patient__name", "dentist__name", "reason", "chair")
    autocomplete_fields = ("patient", "dentist", "consultation")
    date_hierarchy = "scheduled_start"


@admin.register(DentalRecord)
class DentalRecordAdmin(DentalCoreAdmin):
    list_display = ("opened_at", "closed_at", "patient", "dentist", "status")
    list_filter = ("status", "deleted", "opened_at")
    search_fields = ("custom_id", "patient__name", "dentist__name", "chief_complaint", "diagnosis")
    autocomplete_fields = ("patient", "dentist", "appointment")
    date_hierarchy = "opened_at"
    inlines = [DentalOdontogramInline]


@admin.register(DentalConsultation)
class DentalConsultationAdmin(DentalCoreAdmin):
    list_display = ("started_at", "ended_at", "patient", "dentist", "status", "appointment")
    list_filter = ("status", "deleted", "started_at")
    search_fields = ("custom_id", "patient__name", "dentist__name", "chief_complaint", "clinical_observations")
    autocomplete_fields = ("patient", "dentist", "appointment", "record")
    date_hierarchy = "started_at"


@admin.register(DentalOdontogram)
class DentalOdontogramAdmin(DentalCoreAdmin):
    list_display = ("charted_at", "patient", "dentition_type", "status", "created_by_dentist")
    list_filter = ("dentition_type", "status", "deleted", "charted_at")
    search_fields = ("custom_id", "patient__name", "record__custom_id", "notes")
    autocomplete_fields = ("patient", "consultation", "record", "created_by_dentist")
    date_hierarchy = "charted_at"


@admin.register(DentalOdontogramEntry)
class DentalOdontogramEntryAdmin(DentalCoreAdmin):
    form = DentalOdontogramEntryAdminForm
    list_display = ("record", "odontogram", "tooth_number", "surface", "condition", "severity", "status", "procedure")
    list_filter = ("surface", "condition", "severity", "status", "deleted")
    search_fields = ("custom_id", "record__custom_id", "record__patient__name", "tooth_number", "diagnosis", "notes")
    autocomplete_fields = ("odontogram", "record", "procedure")


@admin.register(DentalDiagnosis)
class DentalDiagnosisAdmin(DentalCoreAdmin):
    list_display = ("diagnosed_at", "patient", "diagnosis", "severity", "tooth_number", "responsible_dentist")
    list_filter = ("severity", "deleted", "diagnosed_at")
    search_fields = ("custom_id", "patient__name", "diagnosis", "code", "tooth_number", "notes")
    autocomplete_fields = ("patient", "consultation", "record", "odontogram_entry", "responsible_dentist")
    date_hierarchy = "diagnosed_at"


@admin.register(DentalTreatmentPlan)
class DentalTreatmentPlanAdmin(DentalCoreAdmin):
    exclude = ("patient", "record")
    list_display = (
        "title",
        "dentist",
        "priority",
        "status",
        "planned_start",
        "planned_end",
        "estimated_total",
        "approved_amount",
    )
    list_filter = ("priority", "status", "requires_initial_payment", "deleted", "planned_start")
    search_fields = ("custom_id", "title", "dentist__name", "objectives", "notes")
    autocomplete_fields = ("dentist",)
    inlines = [DentalTreatmentPhaseInline, DentalTreatmentPlanItemInline]


@admin.register(DentalTreatmentPhase)
class DentalTreatmentPhaseAdmin(DentalCoreAdmin):
    list_display = (
        "position",
        "title",
        "treatment_plan",
        "phase_type",
        "status",
        "estimated_amount",
        "approved_amount",
    )
    list_filter = ("phase_type", "status", "deleted", "planned_start")
    search_fields = ("custom_id", "title", "treatment_plan__title", "notes")
    autocomplete_fields = ("treatment_plan",)


@admin.register(DentalTreatmentPlanItem)
class DentalTreatmentPlanItemAdmin(DentalCoreAdmin):
    exclude = ("appointment", "completed_at")
    list_display = (
        "position",
        "treatment_plan",
        "phase",
        "procedure",
        "tooth_number",
        "status",
        "financial_status",
        "scheduled_date",
        "final_price",
    )
    list_filter = ("status", "financial_status", "lab_required", "deleted", "scheduled_date")
    search_fields = ("custom_id", "treatment_plan__title", "procedure__name", "tooth_number", "clinical_notes")
    autocomplete_fields = ("treatment_plan", "phase", "procedure")


@admin.register(DentalPatientTreatmentPlan)
class DentalPatientTreatmentPlanAdmin(DentalCoreAdmin):
    list_display = ("patient", "treatment_plan", "status", "valid_from", "valid_until", "is_valid", "dentist")
    list_filter = ("status", "deleted", "valid_from", "valid_until")
    search_fields = ("custom_id", "patient__name", "treatment_plan__title", "dentist__name", "notes")
    autocomplete_fields = ("patient", "treatment_plan", "dentist", "record")
    date_hierarchy = "valid_from"


@admin.register(DentalProsthesisLabOrder)
class DentalProsthesisLabOrderAdmin(DentalCoreAdmin):
    list_display = (
        "order_number",
        "patient",
        "lab_company",
        "prosthesis_type",
        "status",
        "due_date",
        "cost",
        "patient_price",
    )
    list_filter = ("prosthesis_type", "status", "deleted", "due_date")
    search_fields = ("custom_id", "order_number", "patient__name", "lab_company__name", "tooth_numbers", "material")
    autocomplete_fields = ("patient", "dentist", "treatment_item", "procedure_execution", "lab_company")
    date_hierarchy = "due_date"


@admin.register(DentalQuotation)
class DentalQuotationAdmin(DentalCoreAdmin):
    list_display = ("treatment_plan", "patient", "status", "issued_at", "valid_until", "total_amount")
    list_filter = ("status", "deleted", "issued_at", "valid_until")
    search_fields = ("custom_id", "treatment_plan__title", "patient__name", "payment_terms", "notes")
    autocomplete_fields = ("treatment_plan", "patient", "issued_by")
    date_hierarchy = "issued_at"


@admin.register(DentalApproval)
class DentalApprovalAdmin(DentalCoreAdmin):
    list_display = ("treatment_plan", "patient", "approval_scope", "approved_at", "approved_amount", "consent_signed")
    list_filter = ("approval_scope", "consent_signed", "deleted", "approved_at")
    search_fields = ("custom_id", "treatment_plan__title", "patient__name", "approved_by_name", "accepted_terms")
    autocomplete_fields = ("treatment_plan", "quotation", "patient")
    date_hierarchy = "approved_at"


@admin.register(DentalPayment)
class DentalPaymentAdmin(DentalCoreAdmin):
    list_display = (
        "patient",
        "treatment_plan",
        "payment_kind",
        "status",
        "due_date",
        "amount_due",
        "amount_paid",
        "balance",
    )
    list_filter = ("payment_kind", "status", "deleted", "due_date")
    search_fields = ("custom_id", "patient__name", "treatment_plan__title", "method", "external_reference", "notes")
    autocomplete_fields = ("patient", "treatment_plan", "treatment_item", "quotation", "payment")
    date_hierarchy = "due_date"


@admin.register(DentalProcedureExecution)
class DentalProcedureExecutionAdmin(DentalCoreAdmin):
    list_display = ("patient", "procedure", "performed_by", "status", "scheduled_at", "performed_at", "tooth_number")
    list_filter = ("status", "deleted", "scheduled_at", "performed_at")
    search_fields = ("custom_id", "patient__name", "procedure__name", "tooth_number", "clinical_notes")
    autocomplete_fields = (
        "patient",
        "consultation",
        "treatment_plan",
        "treatment_item",
        "appointment",
        "procedure",
        "performed_by",
    )
    date_hierarchy = "performed_at"


@admin.register(DentalImagingOrder)
class DentalImagingOrderAdmin(DentalCoreAdmin):
    list_display = ("requested_at", "patient", "imaging_type", "status", "dentist", "scheduled_at", "acquired_at")
    list_filter = ("imaging_type", "status", "deleted", "requested_at")
    search_fields = ("custom_id", "patient__name", "clinical_indication", "result_summary", "image_reference")
    autocomplete_fields = ("patient", "dentist", "consultation", "record", "treatment_item", "procedure_execution")
    date_hierarchy = "requested_at"


@admin.register(DentalPrescription)
class DentalPrescriptionAdmin(DentalCoreAdmin):
    list_display = ("prescribed_at", "patient", "medication", "dentist", "status")
    list_filter = ("status", "deleted", "prescribed_at")
    search_fields = ("custom_id", "patient__name", "medication", "dose", "frequency", "instructions")
    autocomplete_fields = ("patient", "dentist", "consultation", "record", "procedure_execution", "medication_product")
    date_hierarchy = "prescribed_at"


@admin.register(DentalFollowUp)
class DentalFollowUpAdmin(DentalCoreAdmin):
    list_display = ("due_date", "patient", "followup_reason", "status", "completed_at")
    list_filter = ("status", "deleted", "due_date")
    search_fields = ("custom_id", "patient__name", "followup_reason", "findings", "notes")
    autocomplete_fields = ("patient", "procedure_execution", "appointment", "treatment_plan")
    date_hierarchy = "due_date"


@admin.register(DentalMaterialConsumption)
class DentalMaterialConsumptionAdmin(DentalCoreAdmin):
    list_display = ("consumed_at", "procedure_execution", "material_name", "quantity", "unit_cost", "total_cost")
    list_filter = ("deleted", "consumed_at")
    search_fields = ("custom_id", "procedure_execution__custom_id", "material_name", "notes")
    autocomplete_fields = ("procedure_execution", "product", "warehouse_item", "inventory_movement")
    date_hierarchy = "consumed_at"


@admin.register(DentalClinicalEvolution)
class DentalClinicalEvolutionAdmin(DentalCoreAdmin):
    list_display = ("evolved_at", "patient", "dentist", "treatment_plan", "procedure_execution")
    list_filter = ("deleted", "evolved_at")
    search_fields = ("custom_id", "patient__name", "summary", "next_steps", "notes")
    autocomplete_fields = ("patient", "record", "consultation", "procedure_execution", "treatment_plan", "dentist")
    date_hierarchy = "evolved_at"


@admin.register(DentalDocument)
class DentalDocumentAdmin(DentalCoreAdmin):
    list_display = ("title", "patient", "document_type", "signed", "signed_at")
    list_filter = ("document_type", "signed", "deleted", "signed_at")
    search_fields = ("custom_id", "title", "patient__name", "file_reference", "notes")
    autocomplete_fields = ("patient", "consultation", "record", "treatment_plan")


@admin.register(DentalAuditEvent)
class DentalAuditEventAdmin(DentalCoreAdmin):
    list_display = ("event_at", "event_type", "patient", "treatment_plan", "actor_name")
    list_filter = ("event_type", "deleted", "event_at")
    search_fields = ("custom_id", "event_type", "actor_name", "summary", "patient__name", "treatment_plan__title")
    autocomplete_fields = ("patient", "treatment_plan")
    date_hierarchy = "event_at"


@admin.register(DentalBillingItem)
class DentalBillingItemAdmin(DentalCoreAdmin):
    list_display = (
        "billable_at",
        "patient",
        "description",
        "status",
        "quantity",
        "unit_price",
        "total_amount",
        "invoice",
    )
    list_filter = ("status", "deleted", "billable_at", "billed_at")
    search_fields = ("custom_id", "patient__name", "description", "notes")
    autocomplete_fields = (
        "patient",
        "treatment_plan",
        "treatment_item",
        "procedure_execution",
        "quotation",
        "invoice",
        "invoice_item",
    )
    date_hierarchy = "billable_at"


@admin.register(PatientDentalPlanSummary)
class PatientDentalPlanSummaryAdmin(DentalCoreAdmin):
    list_display = (
        "generated_at",
        "patient",
        "active_plan",
        "plan_status",
        "total_planned_amount",
        "total_paid",
        "balance_amount",
    )
    list_filter = ("plan_status", "deleted", "generated_at")
    search_fields = ("custom_id", "patient__name", "active_plan__title", "notes")
    autocomplete_fields = ("patient", "active_plan", "next_appointment")
    date_hierarchy = "generated_at"
