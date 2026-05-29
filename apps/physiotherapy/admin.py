from django.contrib import admin

from .models import (
    FunctionalAssessment,
    PhysiotherapyDevice,
    RehabilitationDeviceUsage,
    RehabilitationProgressNote,
    RehabilitationSession,
    RehabilitationTreatmentPlan,
    TreatmentPlanIntervention,
)


class TreatmentPlanInterventionInline(admin.TabularInline):
    model = TreatmentPlanIntervention
    extra = 0
    fields = ("position", "intervention_type", "body_region", "description", "device", "duration_minutes", "repetitions", "sets")
    ordering = ("position", "id")


class RehabilitationSessionInline(admin.TabularInline):
    model = RehabilitationSession
    extra = 0
    fields = ("scheduled_at", "therapist", "status", "duration_minutes", "pain_before", "pain_after")
    ordering = ("-scheduled_at",)


class RehabilitationDeviceUsageInline(admin.TabularInline):
    model = RehabilitationDeviceUsage
    extra = 0
    fields = ("device", "started_at", "ended_at", "duration_minutes", "settings")


@admin.register(PhysiotherapyDevice)
class PhysiotherapyDeviceAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "device_type", "status", "location", "next_maintenance")
    list_filter = ("device_type", "status", "deleted")
    search_fields = ("code", "name", "manufacturer", "model", "serial_number", "location")
    ordering = ("name", "code")


@admin.register(FunctionalAssessment)
class FunctionalAssessmentAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "therapist", "assessed_at", "status", "body_region", "pain_score")
    list_filter = ("status", "body_region", "assessed_at", "deleted")
    search_fields = ("custom_id", "patient__name", "therapist__name", "clinical_diagnosis", "functional_diagnosis")
    autocomplete_fields = ("patient", "therapist", "consultation", "medical_record")
    ordering = ("-assessed_at",)


@admin.register(RehabilitationTreatmentPlan)
class RehabilitationTreatmentPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "patient", "therapist", "status", "start_date", "planned_sessions", "completed_sessions", "progress_percent")
    list_filter = ("status", "body_region", "start_date", "deleted")
    search_fields = ("name", "custom_id", "patient__name", "therapist__name", "objectives", "protocol")
    autocomplete_fields = ("patient", "therapist", "assessment", "medical_record", "prescription_item")
    ordering = ("-start_date", "name")
    inlines = (TreatmentPlanInterventionInline, RehabilitationSessionInline)


@admin.register(TreatmentPlanIntervention)
class TreatmentPlanInterventionAdmin(admin.ModelAdmin):
    list_display = ("position", "plan", "intervention_type", "body_region", "description", "device", "duration_minutes")
    list_filter = ("intervention_type", "body_region", "deleted")
    search_fields = ("plan__name", "description", "instructions", "device__name")
    autocomplete_fields = ("plan", "device")
    ordering = ("plan", "position")


@admin.register(RehabilitationSession)
class RehabilitationSessionAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "plan", "patient", "therapist", "scheduled_at", "status", "duration_minutes", "pain_before", "pain_after")
    list_filter = ("status", "scheduled_at", "deleted")
    search_fields = ("custom_id", "plan__name", "patient__name", "therapist__name", "interventions_performed", "patient_response")
    autocomplete_fields = ("plan", "patient", "therapist")
    ordering = ("-scheduled_at",)
    inlines = (RehabilitationDeviceUsageInline,)


@admin.register(RehabilitationProgressNote)
class RehabilitationProgressNoteAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "plan", "session", "recorded_at", "trend", "functional_score", "pain_score", "progress_percent")
    list_filter = ("trend", "recorded_at", "deleted")
    search_fields = ("custom_id", "plan__name", "summary", "recommendations")
    autocomplete_fields = ("plan", "session")
    ordering = ("-recorded_at",)


@admin.register(RehabilitationDeviceUsage)
class RehabilitationDeviceUsageAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "session", "device", "started_at", "ended_at", "duration_minutes", "settings")
    list_filter = ("started_at", "deleted")
    search_fields = ("custom_id", "session__custom_id", "device__name", "settings", "outcome")
    autocomplete_fields = ("session", "device")
    ordering = ("-started_at",)
