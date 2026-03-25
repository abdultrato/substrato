from django.contrib import admin

from .models.medical_record_entry import MedicalRecordEntry
from .models.prescription_item import PrescriptionItem


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


class PrescricaoItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 0
    autocomplete_fields = ("medication",)
    fields = (
        "medication",
        "dosage_value",
        "dosage_unit",
        "interval_hours",
        "dose_count",
        "notes",
    )


@admin.register(MedicalRecordEntry)
class MedicalRecordEntryAdmin(CoreAdmin):
    list_display = (
        "care_start_at",
        "care_end_at",
        "patient",
        "doctor",
        "status",
    )
    list_filter = ("status",)
    search_fields = ("patient__name", "doctor__name", "diagnosis")
    ordering = ("-care_start_at", "-created_at")

    filter_horizontal = ("consultations",)
    inlines = [PrescricaoItemInline]


@admin.register(PrescriptionItem)
class PrescricaoItemAdmin(CoreAdmin):
    list_display = (
        "record",
        "medication",
        "dosage_value",
        "dosage_unit",
        "interval_hours",
        "dose_count",
        "created_at",
    )
    list_filter = ("dosage_unit", "deleted")
    search_fields = (
        "record__custom_id",
        "record__patient__name",
        "medication__name",
    )
    autocomplete_fields = ("record", "medication")


RegistroProntuarioAdmin = MedicalRecordEntryAdmin
