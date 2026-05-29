from django.contrib import admin

from apps.dental.models import (
    DentalAppointment,
    DentalOdontogramEntry,
    DentalProcedure,
    DentalProsthesisLabOrder,
    DentalRecord,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
)


class DentalCoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    readonly_fields = ("custom_id", "created_at", "updated_at")
    search_fields = ("custom_id",)
    ordering = ("-created_at",)


class DentalOdontogramInline(admin.TabularInline):
    model = DentalOdontogramEntry
    extra = 0
    autocomplete_fields = ("procedure",)
    fields = ("tooth_number", "surface", "condition", "procedure", "notes")


class DentalTreatmentPlanItemInline(admin.TabularInline):
    model = DentalTreatmentPlanItem
    extra = 0
    autocomplete_fields = ("procedure", "appointment")
    fields = (
        "position",
        "procedure",
        "tooth_number",
        "surface",
        "status",
        "scheduled_date",
        "quantity",
        "unit_price",
        "lab_required",
    )


@admin.register(DentalProcedure)
class DentalProcedureAdmin(DentalCoreAdmin):
    list_display = ("code", "name", "category", "default_duration_minutes", "base_price", "requires_prosthesis_lab", "active")
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


@admin.register(DentalOdontogramEntry)
class DentalOdontogramEntryAdmin(DentalCoreAdmin):
    list_display = ("record", "tooth_number", "surface", "condition", "procedure")
    list_filter = ("surface", "condition", "deleted")
    search_fields = ("custom_id", "record__custom_id", "record__patient__name", "tooth_number", "notes")
    autocomplete_fields = ("record", "procedure")


@admin.register(DentalTreatmentPlan)
class DentalTreatmentPlanAdmin(DentalCoreAdmin):
    list_display = ("title", "patient", "dentist", "status", "planned_start", "planned_end", "estimated_total")
    list_filter = ("status", "deleted", "planned_start")
    search_fields = ("custom_id", "title", "patient__name", "dentist__name", "objectives")
    autocomplete_fields = ("patient", "dentist", "record")
    inlines = [DentalTreatmentPlanItemInline]


@admin.register(DentalTreatmentPlanItem)
class DentalTreatmentPlanItemAdmin(DentalCoreAdmin):
    list_display = ("position", "treatment_plan", "procedure", "tooth_number", "status", "scheduled_date", "total_price")
    list_filter = ("status", "lab_required", "deleted", "scheduled_date")
    search_fields = ("custom_id", "treatment_plan__title", "procedure__name", "tooth_number", "clinical_notes")
    autocomplete_fields = ("treatment_plan", "procedure", "appointment")


@admin.register(DentalProsthesisLabOrder)
class DentalProsthesisLabOrderAdmin(DentalCoreAdmin):
    list_display = ("order_number", "patient", "lab_company", "prosthesis_type", "status", "due_date", "cost")
    list_filter = ("prosthesis_type", "status", "deleted", "due_date")
    search_fields = ("custom_id", "order_number", "patient__name", "lab_company__name", "tooth_numbers", "material")
    autocomplete_fields = ("patient", "dentist", "treatment_item", "lab_company")
    date_hierarchy = "due_date"
