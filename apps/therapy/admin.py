from django.contrib import admin

from .models import (
    TherapeuticResource,
    TherapyEvaluation,
    TherapyPlanGoal,
    TherapyPrescriptionLink,
    TherapyProgressNote,
    TherapySession,
    TherapyTreatmentPlan,
)


class TherapyPlanGoalInline(admin.TabularInline):
    model = TherapyPlanGoal
    extra = 0
    fields = ("position", "discipline", "domain", "status", "description", "baseline_score", "target_score", "current_score")
    ordering = ("position", "id")


class TherapySessionInline(admin.TabularInline):
    model = TherapySession
    extra = 0
    fields = ("scheduled_at", "therapist", "status", "duration_minutes", "motor_score", "functional_score")
    ordering = ("-scheduled_at",)


class TherapyPrescriptionLinkInline(admin.TabularInline):
    model = TherapyPrescriptionLink
    extra = 0
    fields = ("prescription_item", "discipline", "status", "priority", "requested_sessions", "requested_at")
    ordering = ("-requested_at",)


@admin.register(TherapeuticResource)
class TherapeuticResourceAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "discipline", "resource_type", "status", "location", "next_review")
    list_filter = ("discipline", "resource_type", "status", "deleted")
    search_fields = ("code", "name", "manufacturer", "model", "serial_number", "location")
    ordering = ("name", "code")


@admin.register(TherapyEvaluation)
class TherapyEvaluationAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "therapist", "discipline", "status", "evaluated_at", "motor_score", "activities_daily_living_score")
    list_filter = ("discipline", "status", "evaluated_at", "deleted")
    search_fields = ("custom_id", "patient__name", "therapist__name", "clinical_diagnosis", "functional_diagnosis", "referral_reason")
    autocomplete_fields = ("patient", "therapist", "consultation", "medical_record", "prescription_item")
    ordering = ("-evaluated_at",)


@admin.register(TherapyTreatmentPlan)
class TherapyTreatmentPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "patient", "therapist", "discipline", "status", "start_date", "planned_sessions", "completed_sessions", "progress_percent")
    list_filter = ("discipline", "status", "start_date", "deleted")
    search_fields = ("name", "custom_id", "patient__name", "therapist__name", "objectives", "intervention_strategy")
    autocomplete_fields = ("patient", "therapist", "evaluation", "medical_record", "prescription_item")
    ordering = ("-start_date", "name")
    inlines = (TherapyPlanGoalInline, TherapySessionInline, TherapyPrescriptionLinkInline)


@admin.register(TherapyPlanGoal)
class TherapyPlanGoalAdmin(admin.ModelAdmin):
    list_display = ("position", "plan", "discipline", "domain", "status", "description", "baseline_score", "target_score", "current_score")
    list_filter = ("discipline", "domain", "status", "deleted")
    search_fields = ("plan__name", "description", "target", "notes")
    autocomplete_fields = ("plan",)
    ordering = ("plan", "position")


@admin.register(TherapySession)
class TherapySessionAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "plan", "patient", "therapist", "discipline", "scheduled_at", "status", "duration_minutes", "functional_score")
    list_filter = ("discipline", "status", "scheduled_at", "deleted")
    search_fields = ("custom_id", "plan__name", "patient__name", "therapist__name", "interventions_performed", "patient_response")
    autocomplete_fields = ("plan", "patient", "therapist")
    ordering = ("-scheduled_at",)


@admin.register(TherapyProgressNote)
class TherapyProgressNoteAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "plan", "session", "discipline", "recorded_at", "domain", "trend", "functional_score", "progress_percent")
    list_filter = ("discipline", "domain", "trend", "recorded_at", "deleted")
    search_fields = ("custom_id", "plan__name", "summary", "recommendations")
    autocomplete_fields = ("plan", "session")
    ordering = ("-recorded_at",)


@admin.register(TherapyPrescriptionLink)
class TherapyPrescriptionLinkAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "discipline", "status", "priority", "requested_service", "requested_sessions", "requested_at")
    list_filter = ("discipline", "status", "priority", "requested_at", "deleted")
    search_fields = ("custom_id", "patient__name", "requested_service", "notes")
    autocomplete_fields = ("patient", "prescription_item", "plan")
    ordering = ("-requested_at",)
