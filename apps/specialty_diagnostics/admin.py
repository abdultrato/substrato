from django.contrib import admin

from .models import (
    SpecialtyDiagnosticEquipment,
    SpecialtyDiagnosticIntegrationEvent,
    SpecialtyDiagnosticMeasurement,
    SpecialtyDiagnosticOrder,
    SpecialtyDiagnosticProtocol,
    SpecialtyDiagnosticReport,
)


class SpecialtyDiagnosticMeasurementInline(admin.TabularInline):
    model = SpecialtyDiagnosticMeasurement
    extra = 0
    fields = ("position", "code", "name", "value_type", "numeric_value", "text_value", "unit", "abnormal", "critical")
    ordering = ("position", "id")


class SpecialtyDiagnosticReportInline(admin.TabularInline):
    model = SpecialtyDiagnosticReport
    extra = 0
    fields = ("version_number", "specialist", "status", "reported_at", "signed_at", "critical_result")
    ordering = ("-reported_at",)


class SpecialtyDiagnosticIntegrationEventInline(admin.TabularInline):
    model = SpecialtyDiagnosticIntegrationEvent
    extra = 0
    fields = ("event_type", "direction", "status", "external_system", "event_at", "retry_count")
    ordering = ("-event_at",)


@admin.register(SpecialtyDiagnosticEquipment)
class SpecialtyDiagnosticEquipmentAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "specialty", "modality", "status", "location", "next_quality_control")
    list_filter = ("specialty", "modality", "status", "deleted")
    search_fields = ("code", "name", "manufacturer", "model", "serial_number", "station_name", "location")
    ordering = ("specialty", "name", "code")


@admin.register(SpecialtyDiagnosticProtocol)
class SpecialtyDiagnosticProtocolAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "specialty", "modality", "typical_duration_minutes")
    list_filter = ("specialty", "modality", "deleted")
    search_fields = ("code", "name", "preparation", "acquisition_instructions", "default_report_template")
    ordering = ("specialty", "modality", "name")


@admin.register(SpecialtyDiagnosticOrder)
class SpecialtyDiagnosticOrderAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "order_number", "patient", "specialty", "modality", "status", "priority", "scheduled_at")
    list_filter = ("specialty", "modality", "status", "priority", "requested_at", "deleted")
    search_fields = ("custom_id", "order_number", "external_order_id", "patient__name", "clinical_indication")
    autocomplete_fields = ("patient", "requesting_doctor", "specialist", "consultation", "medical_record", "prescription_item", "protocol", "equipment")
    ordering = ("-requested_at",)
    inlines = (SpecialtyDiagnosticMeasurementInline, SpecialtyDiagnosticReportInline, SpecialtyDiagnosticIntegrationEventInline)


@admin.register(SpecialtyDiagnosticMeasurement)
class SpecialtyDiagnosticMeasurementAdmin(admin.ModelAdmin):
    list_display = ("name", "order", "code", "value_type", "numeric_value", "unit", "abnormal", "critical")
    list_filter = ("value_type", "abnormal", "critical", "deleted")
    search_fields = ("name", "code", "order__order_number", "order__patient__name", "text_value", "interpretation")
    autocomplete_fields = ("order",)
    ordering = ("order", "position")


@admin.register(SpecialtyDiagnosticReport)
class SpecialtyDiagnosticReportAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "order", "specialist", "status", "version_number", "reported_at", "signed_at", "critical_result")
    list_filter = ("status", "critical_result", "reported_at", "deleted")
    search_fields = ("custom_id", "order__order_number", "order__patient__name", "findings", "impression", "recommendations")
    autocomplete_fields = ("order", "specialist")
    ordering = ("-reported_at",)


@admin.register(SpecialtyDiagnosticIntegrationEvent)
class SpecialtyDiagnosticIntegrationEventAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "order", "event_type", "direction", "status", "external_system", "event_at", "retry_count")
    list_filter = ("event_type", "direction", "status", "external_system", "event_at", "deleted")
    search_fields = ("custom_id", "order__order_number", "external_order_id", "message_control_id", "error_message")
    autocomplete_fields = ("order", "equipment")
    ordering = ("-event_at",)
