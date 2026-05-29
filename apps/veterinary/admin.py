from django.contrib import admin

from apps.veterinary.models import (
    VeterinaryAdmission,
    VeterinaryAnimal,
    VeterinaryAppointment,
    VeterinaryLabExam,
    VeterinaryLabRequest,
    VeterinaryLabRequestItem,
    VeterinaryMedicalRecord,
    VeterinaryPrescription,
    VeterinaryPrescriptionItem,
    VeterinaryVaccination,
    VeterinaryVaccine,
)


class VeterinaryCoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    readonly_fields = ("custom_id", "created_at", "updated_at")
    search_fields = ("custom_id",)
    ordering = ("-created_at",)


class VeterinaryLabRequestItemInline(admin.TabularInline):
    model = VeterinaryLabRequestItem
    extra = 0
    autocomplete_fields = ("exam",)
    fields = ("position", "exam", "sample_identifier", "status", "result_value", "reference_range", "resulted_at")


class VeterinaryPrescriptionItemInline(admin.TabularInline):
    model = VeterinaryPrescriptionItem
    extra = 0
    autocomplete_fields = ("medication",)
    fields = ("position", "medication", "medication_name", "dosage", "route", "frequency", "duration_days", "quantity")


@admin.register(VeterinaryAnimal)
class VeterinaryAnimalAdmin(VeterinaryCoreAdmin):
    list_display = ("name", "species", "breed", "sex", "owner_name", "owner_phone", "status")
    list_filter = ("species", "sex", "status", "deleted")
    search_fields = ("custom_id", "name", "breed", "microchip_number", "owner_name", "owner_phone", "owner_email")


@admin.register(VeterinaryAppointment)
class VeterinaryAppointmentAdmin(VeterinaryCoreAdmin):
    list_display = ("scheduled_start", "scheduled_end", "animal", "veterinarian", "status", "room")
    list_filter = ("status", "deleted", "scheduled_start")
    search_fields = ("custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "reason", "room")
    autocomplete_fields = ("animal", "veterinarian")
    date_hierarchy = "scheduled_start"


@admin.register(VeterinaryMedicalRecord)
class VeterinaryMedicalRecordAdmin(VeterinaryCoreAdmin):
    list_display = ("opened_at", "closed_at", "animal", "veterinarian", "status", "weight_kg", "temperature_c")
    list_filter = ("status", "deleted", "opened_at")
    search_fields = ("custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "diagnosis", "symptoms")
    autocomplete_fields = ("animal", "veterinarian", "appointment")
    date_hierarchy = "opened_at"


@admin.register(VeterinaryVaccine)
class VeterinaryVaccineAdmin(VeterinaryCoreAdmin):
    list_display = ("name", "species", "disease", "manufacturer", "default_interval_days", "active")
    list_filter = ("species", "active", "deleted")
    search_fields = ("custom_id", "name", "disease", "manufacturer", "notes")


@admin.register(VeterinaryVaccination)
class VeterinaryVaccinationAdmin(VeterinaryCoreAdmin):
    list_display = ("animal", "vaccine", "status", "scheduled_for", "administered_at", "next_due_date", "lot_number")
    list_filter = ("status", "deleted", "scheduled_for", "next_due_date")
    search_fields = ("custom_id", "animal__name", "animal__owner_name", "vaccine__name", "lot_number")
    autocomplete_fields = ("animal", "vaccine", "veterinarian")
    date_hierarchy = "scheduled_for"


@admin.register(VeterinaryLabExam)
class VeterinaryLabExamAdmin(VeterinaryCoreAdmin):
    list_display = ("code", "name", "species", "sample_type", "turnaround_hours", "active")
    list_filter = ("species", "sample_type", "active", "deleted")
    search_fields = ("custom_id", "code", "name", "notes")


@admin.register(VeterinaryLabRequest)
class VeterinaryLabRequestAdmin(VeterinaryCoreAdmin):
    list_display = ("requested_at", "animal", "veterinarian", "priority", "status")
    list_filter = ("priority", "status", "deleted", "requested_at")
    search_fields = ("custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "clinical_notes")
    autocomplete_fields = ("animal", "veterinarian", "appointment", "record")
    date_hierarchy = "requested_at"
    inlines = [VeterinaryLabRequestItemInline]


@admin.register(VeterinaryLabRequestItem)
class VeterinaryLabRequestItemAdmin(VeterinaryCoreAdmin):
    list_display = ("position", "request", "exam", "sample_identifier", "status", "resulted_at")
    list_filter = ("status", "deleted", "resulted_at")
    search_fields = ("custom_id", "request__custom_id", "request__animal__name", "exam__name", "sample_identifier")
    autocomplete_fields = ("request", "exam")


@admin.register(VeterinaryAdmission)
class VeterinaryAdmissionAdmin(VeterinaryCoreAdmin):
    list_display = ("admitted_at", "discharged_at", "animal", "veterinarian", "status", "ward", "cage")
    list_filter = ("status", "ward", "deleted", "admitted_at")
    search_fields = ("custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "ward", "cage", "diagnosis")
    autocomplete_fields = ("animal", "veterinarian", "appointment")
    date_hierarchy = "admitted_at"


@admin.register(VeterinaryPrescription)
class VeterinaryPrescriptionAdmin(VeterinaryCoreAdmin):
    list_display = ("issued_at", "animal", "veterinarian", "status")
    list_filter = ("status", "deleted", "issued_at")
    search_fields = ("custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "instructions")
    autocomplete_fields = ("animal", "record", "veterinarian")
    date_hierarchy = "issued_at"
    inlines = [VeterinaryPrescriptionItemInline]


@admin.register(VeterinaryPrescriptionItem)
class VeterinaryPrescriptionItemAdmin(VeterinaryCoreAdmin):
    list_display = ("position", "prescription", "medication_name", "route", "frequency", "duration_days", "quantity")
    list_filter = ("route", "deleted")
    search_fields = ("custom_id", "prescription__custom_id", "prescription__animal__name", "medication_name", "dosage")
    autocomplete_fields = ("prescription", "medication")
