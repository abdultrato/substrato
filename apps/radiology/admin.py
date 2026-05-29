from django.contrib import admin

from .models import (
    ImagingEquipment,
    ImagingFile,
    ImagingProtocol,
    ImagingReport,
    ImagingSeries,
    ImagingStudy,
    PacsIntegrationEvent,
)


class ImagingSeriesInline(admin.TabularInline):
    model = ImagingSeries
    extra = 0
    fields = ("series_number", "series_instance_uid", "modality", "body_region", "image_count", "storage_uri")
    ordering = ("series_number", "id")


class ImagingFileInline(admin.TabularInline):
    model = ImagingFile
    extra = 0
    fields = ("series", "file_type", "sop_instance_uid", "pacs_object_uri", "image_number", "file_size")
    ordering = ("series", "image_number", "id")


class ImagingReportInline(admin.TabularInline):
    model = ImagingReport
    extra = 0
    fields = ("version_number", "radiologist", "status", "reported_at", "signed_at", "critical_result")
    ordering = ("-reported_at",)


class PacsIntegrationEventInline(admin.TabularInline):
    model = PacsIntegrationEvent
    extra = 0
    fields = ("event_type", "direction", "status", "external_system", "event_at", "retry_count")
    ordering = ("-event_at",)


@admin.register(ImagingEquipment)
class ImagingEquipmentAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "modality", "status", "ae_title", "location", "next_quality_control")
    list_filter = ("modality", "status", "deleted")
    search_fields = ("code", "name", "manufacturer", "model", "serial_number", "ae_title", "station_name", "location")
    ordering = ("name", "code")


@admin.register(ImagingProtocol)
class ImagingProtocolAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "modality", "body_region", "contrast_required", "typical_duration_minutes")
    list_filter = ("modality", "body_region", "contrast_required", "deleted")
    search_fields = ("code", "name", "preparation", "acquisition_instructions", "default_report_template")
    ordering = ("modality", "name")


@admin.register(ImagingStudy)
class ImagingStudyAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "accession_number", "patient", "modality", "body_region", "status", "priority", "scheduled_at")
    list_filter = ("modality", "body_region", "status", "priority", "images_available", "requested_at", "deleted")
    search_fields = ("custom_id", "accession_number", "study_instance_uid", "patient__name", "clinical_indication")
    autocomplete_fields = ("patient", "requesting_doctor", "radiologist", "consultation", "medical_record", "prescription_item", "protocol", "equipment")
    ordering = ("-requested_at",)
    inlines = (ImagingSeriesInline, ImagingFileInline, ImagingReportInline, PacsIntegrationEventInline)


@admin.register(ImagingSeries)
class ImagingSeriesAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "study", "series_number", "modality", "body_region", "image_count", "series_instance_uid")
    list_filter = ("modality", "body_region", "deleted")
    search_fields = ("custom_id", "study__accession_number", "series_instance_uid", "description", "storage_uri")
    autocomplete_fields = ("study",)
    ordering = ("study", "series_number")


@admin.register(ImagingFile)
class ImagingFileAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "study", "series", "file_type", "image_number", "sop_instance_uid", "file_size")
    list_filter = ("file_type", "deleted")
    search_fields = ("custom_id", "study__accession_number", "series__series_instance_uid", "sop_instance_uid", "pacs_object_uri", "checksum")
    autocomplete_fields = ("study", "series")
    ordering = ("study", "series", "image_number")


@admin.register(ImagingReport)
class ImagingReportAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "study", "radiologist", "status", "version_number", "reported_at", "signed_at", "critical_result")
    list_filter = ("status", "critical_result", "reported_at", "deleted")
    search_fields = ("custom_id", "study__accession_number", "study__patient__name", "findings", "impression", "recommendations")
    autocomplete_fields = ("study", "radiologist")
    ordering = ("-reported_at",)


@admin.register(PacsIntegrationEvent)
class PacsIntegrationEventAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "study", "event_type", "direction", "status", "external_system", "event_at", "retry_count")
    list_filter = ("event_type", "direction", "status", "external_system", "event_at", "deleted")
    search_fields = ("custom_id", "study__accession_number", "accession_number", "study_instance_uid", "message_control_id", "error_message")
    autocomplete_fields = ("study", "equipment")
    ordering = ("-event_at",)
