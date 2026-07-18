"""Configuração do admin para Cirurgias e procedimentos cirúrgicos."""

from django.contrib import admin

from .models import (
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


class CoreAdmin(admin.ModelAdmin):
    """Base admin com filtros padrões e auditoria read-only."""
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = ("custom_id", "created_at", "updated_at")
    ordering = ("-created_at",)


class BaseCirurgiaAdmin(CoreAdmin):
    """Base compartilhada para pequenas e grandes cirurgias."""
    list_display = (
        "scheduled_for",
        "patient",
        "surgeon",
        "specialty",
        "procedures_lista",
        "estimated_price",
        "priority",
        "classification",
        "vat_percentage",
        "surgery_size",
        "status",
    )
    list_filter = ("surgery_size", "priority", "classification", "status", "deleted")
    search_fields = ("custom_id", "procedure", "patient__name", "surgeon__username", "specialty__name", "procedures__name")
    ordering = ("-scheduled_for", "-created_at")
    filter_horizontal = ("procedures",)
    autocomplete_fields = ("patient", "surgical_request", "specialty", "surgeon", "operating_room", "procedures")

    def procedures_lista(self, obj):
        """Lista resumida de procedimentos associados (fallback para texto livre)."""
        nomes = list(obj.procedures.values_list("name", flat=True)[:3])
        if not nomes and (obj.procedure or "").strip():
            return obj.procedure
        if len(nomes) == 3 and obj.procedures.count() > 3:
            return ", ".join(nomes) + "..."
        return ", ".join(nomes) if nomes else "-"

    procedures_lista.short_description = "Procedimentos"


@admin.register(SmallSurgery)
class PequenaCirurgiaAdmin(BaseCirurgiaAdmin):
    """Administra pequenas cirurgias."""


@admin.register(LargeSurgery)
class GrandeCirurgiaAdmin(BaseCirurgiaAdmin):
    """Administra grandes cirurgias."""


@admin.register(Surgery)
class CirurgiaAdmin(BaseCirurgiaAdmin):
    """Administra todas as cirurgias (visão consolidada)."""


@admin.register(SurgicalProcedure)
class ProcedimentoCirurgicoAdmin(CoreAdmin):
    """Catálogo de procedimentos cirúrgicos."""
    list_display = ("name", "is_surgical", "surgery_type", "base_price", "vat_percentage", "applies_vat_by_default", "active", "created_at")
    list_filter = ("is_surgical", "surgery_type", "active", "deleted")
    search_fields = ("name", "description", "custom_id")
    ordering = ("name",)


@admin.register(SurgicalRequest)
class SurgicalRequestAdmin(CoreAdmin):
    list_display = ("custom_id", "patient", "requesting_doctor", "specialty", "requested_surgery_type", "priority", "status", "created_at")
    list_filter = ("requested_surgery_type", "priority", "status", "deleted", "created_at")
    search_fields = ("custom_id", "patient__name", "requesting_doctor__name", "specialty__name", "clinical_diagnosis", "icd_code", "requested_procedure")
    autocomplete_fields = ("patient", "requesting_doctor", "specialty")
    date_hierarchy = "created_at"


@admin.register(PreoperativeAssessment)
class PreoperativeAssessmentAdmin(CoreAdmin):
    list_display = ("custom_id", "patient", "surgical_request", "proposed_surgery", "asa_class", "fit_for_surgery", "status", "assessed_at")
    list_filter = ("asa_class", "fit_for_surgery", "status", "deleted", "assessed_at")
    search_fields = ("custom_id", "patient__name", "surgical_request__custom_id", "proposed_surgery__custom_id", "surgical_risk", "observations")
    autocomplete_fields = ("patient", "surgical_request", "proposed_surgery", "evaluator")
    date_hierarchy = "assessed_at"


@admin.register(OperatingRoom)
class OperatingRoomAdmin(CoreAdmin):
    list_display = ("code", "name", "room_type", "status", "location", "capacity", "sterile", "cleaning_class")
    list_filter = ("room_type", "status", "sterile", "deleted")
    search_fields = ("custom_id", "code", "name", "location")
    ordering = ("name", "code")


@admin.register(SurgicalSchedule)
class SurgicalScheduleAdmin(CoreAdmin):
    list_display = ("scheduled_start", "scheduled_end", "surgery", "operating_room", "primary_surgeon", "anesthetist", "status", "priority")
    list_filter = ("status", "priority", "authorization_verified", "deleted", "scheduled_start")
    search_fields = ("custom_id", "surgery__custom_id", "surgery__patient__name", "operating_room__name", "primary_surgeon__name", "anesthetist__name", "notes")
    autocomplete_fields = ("surgery", "operating_room", "primary_surgeon", "anesthetist")
    date_hierarchy = "scheduled_start"


@admin.register(SurgicalTeamMember)
class SurgicalTeamMemberAdmin(CoreAdmin):
    list_display = ("surgery", "employee", "role", "lead", "present", "entry_at", "exit_at", "signed_at")
    list_filter = ("role", "lead", "present", "deleted")
    search_fields = ("custom_id", "surgery__custom_id", "employee__name", "responsibility", "notes")
    autocomplete_fields = ("surgery", "employee")


@admin.register(AnesthesiaRecord)
class AnesthesiaRecordAdmin(CoreAdmin):
    list_display = ("surgery", "anesthetist", "anesthesia_type", "asa_class", "status", "induction_at", "started_at", "ended_at")
    list_filter = ("anesthesia_type", "status", "asa_class", "deleted", "started_at")
    search_fields = ("custom_id", "surgery__custom_id", "anesthetist__name", "airway_management", "complications", "notes")
    autocomplete_fields = ("surgery", "anesthetist")
    date_hierarchy = "started_at"


@admin.register(SurgicalSafetyChecklist)
class SurgicalSafetyChecklistAdmin(CoreAdmin):
    list_display = ("surgery", "phase", "status", "completed_by", "completed_at", "is_complete")
    list_filter = ("phase", "status", "completed_at", "deleted")
    search_fields = ("custom_id", "surgery__custom_id", "completed_by__name", "notes")
    autocomplete_fields = ("surgery", "completed_by")
    date_hierarchy = "completed_at"


@admin.register(SurgicalMaterial)
class SurgicalMaterialAdmin(CoreAdmin):
    list_display = ("code", "name", "material_type", "unit", "cost_price", "sale_price", "implantable", "reusable", "sterile", "active")
    list_filter = ("material_type", "implantable", "sterilizable", "reusable", "sterile", "active", "deleted")
    search_fields = ("custom_id", "code", "internal_code", "name", "product__name", "batch_number", "notes")
    autocomplete_fields = ("product",)
    ordering = ("name", "code")


@admin.register(SurgicalConsumption)
class SurgicalConsumptionAdmin(CoreAdmin):
    list_display = ("consumed_at", "surgery", "material", "product", "quantity", "unit_cost", "charged_price", "line_total", "billing_status")
    list_filter = ("billing_status", "material_status", "inventory_deducted", "deleted", "consumed_at")
    search_fields = ("custom_id", "surgery__custom_id", "material__name", "product__name", "batch_number", "notes")
    autocomplete_fields = ("surgery", "material", "product", "consumed_by")
    date_hierarchy = "consumed_at"


@admin.register(RecoveryRecord)
class RecoveryRecordAdmin(CoreAdmin):
    list_display = ("admitted_at", "discharged_at", "surgery", "nurse", "status", "pain_score", "aldrete_score")
    list_filter = ("status", "deleted", "admitted_at")
    search_fields = ("custom_id", "surgery__custom_id", "nurse__name", "destination", "complications", "notes")
    autocomplete_fields = ("surgery", "nurse")
    date_hierarchy = "admitted_at"


@admin.register(SurgeryProcedureItem)
class SurgeryProcedureItemAdmin(CoreAdmin):
    list_display = ("surgery", "sequence", "procedure", "description", "responsible_surgeon", "status", "quantity", "unit_price", "line_total")
    list_filter = ("status", "laterality", "deleted")
    search_fields = ("custom_id", "surgery__custom_id", "surgery__patient__name", "procedure__name", "description", "anatomical_region")
    autocomplete_fields = ("surgery", "procedure", "responsible_surgeon")


@admin.register(SurgicalAuthorization)
class SurgicalAuthorizationAdmin(CoreAdmin):
    list_display = ("custom_id", "patient", "surgery", "surgical_request", "status", "quotation_amount", "approved_amount", "initial_payment_received", "insurance_authorized")
    list_filter = ("status", "budget_approved", "initial_payment_received", "insurance_authorized", "consent_signed", "deleted")
    search_fields = ("custom_id", "patient__name", "surgery__custom_id", "surgical_request__custom_id", "notes")
    autocomplete_fields = ("patient", "surgery", "surgical_request", "preoperative_assessment")
    date_hierarchy = "approved_at"


@admin.register(SurgicalBillingItem)
class SurgicalBillingItemAdmin(CoreAdmin):
    list_display = ("surgery", "event_type", "billing_mode", "description", "quantity", "unit_price", "line_total", "status", "billable")
    list_filter = ("event_type", "billing_mode", "status", "billable", "deleted")
    search_fields = ("custom_id", "surgery__custom_id", "surgery__patient__name", "description", "notes")
    autocomplete_fields = ("surgery", "authorization", "procedure_item", "consumption", "invoice")


@admin.register(SurgicalDocument)
class SurgicalDocumentAdmin(CoreAdmin):
    list_display = ("title", "document_type", "status", "surgery", "surgical_request", "signed_at", "expires_at")
    list_filter = ("document_type", "status", "deleted", "signed_at")
    search_fields = ("custom_id", "title", "surgery__custom_id", "surgical_request__custom_id", "external_reference", "notes")
    autocomplete_fields = ("surgery", "surgical_request", "preoperative_assessment", "authorization", "uploaded_by")


@admin.register(SurgicalAuditEvent)
class SurgicalAuditEventAdmin(CoreAdmin):
    list_display = ("occurred_at", "event_type", "action", "surgery", "surgical_request", "actor")
    list_filter = ("event_type", "deleted", "occurred_at")
    search_fields = ("custom_id", "action", "surgery__custom_id", "surgical_request__custom_id", "actor__name", "notes")
    autocomplete_fields = ("surgery", "surgical_request", "actor")
    date_hierarchy = "occurred_at"


@admin.register(SurgicalSpecimen)
class SurgicalSpecimenAdmin(CoreAdmin):
    list_display = ("collected_at", "surgery", "patient", "specimen_type", "anatomical_site", "status", "pathology_request")
    list_filter = ("status", "deleted", "collected_at")
    search_fields = ("custom_id", "surgery__custom_id", "patient__name", "specimen_type", "anatomical_site", "fixative", "notes")
    autocomplete_fields = ("surgery", "patient", "responsible", "pathology_request")
    date_hierarchy = "collected_at"


@admin.register(OperativeReport)
class OperativeReportAdmin(CoreAdmin):
    list_display = ("surgery", "primary_surgeon", "status", "specimen_sent_to_pathology", "digitally_signed", "signed_at")
    list_filter = ("status", "specimen_sent_to_pathology", "digitally_signed", "deleted", "signed_at")
    search_fields = ("custom_id", "surgery__custom_id", "primary_surgeon__name", "procedure_performed", "findings", "pathology_accession_number")
    autocomplete_fields = ("surgery", "primary_surgeon")
    date_hierarchy = "signed_at"
