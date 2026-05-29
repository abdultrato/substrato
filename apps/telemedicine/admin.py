from django.contrib import admin

from .models import (
    ChronicMonitoringProgram,
    RemoteClinicalAlert,
    RemoteMonitoringDevice,
    RemoteVitalReading,
    StoreAndForwardCase,
    TelemedicineWaitingRoomEntry,
)


@admin.register(TelemedicineWaitingRoomEntry)
class TelemedicineWaitingRoomEntryAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "consultation", "status", "priority", "queue_position", "check_in_at", "estimated_start_at")
    list_filter = ("status", "priority", "device_check_passed", "consent_confirmed", "check_in_at", "deleted")
    search_fields = ("custom_id", "patient__name", "consultation__custom_id", "chief_complaint", "triage_notes")
    autocomplete_fields = ("consultation", "patient", "clinician")
    ordering = ("queue_position", "check_in_at")


@admin.register(RemoteMonitoringDevice)
class RemoteMonitoringDeviceAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "device_type", "status", "serial_number", "external_device_id", "last_sync_at", "battery_percent")
    list_filter = ("device_type", "status", "last_sync_at", "deleted")
    search_fields = ("custom_id", "patient__name", "serial_number", "external_device_id", "manufacturer", "model_name")
    autocomplete_fields = ("patient",)
    ordering = ("patient", "device_type")


@admin.register(RemoteVitalReading)
class RemoteVitalReadingAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "device", "measured_at", "systolic_bp", "diastolic_bp", "glucose_mg_dl", "spo2_percent", "heart_rate_bpm")
    list_filter = ("source", "measured_at", "deleted")
    search_fields = ("custom_id", "patient__name", "device__serial_number", "notes")
    autocomplete_fields = ("patient", "device")
    ordering = ("-measured_at",)


@admin.register(StoreAndForwardCase)
class StoreAndForwardCaseAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "title", "patient", "specialty_area", "status", "submitted_at", "reviewed_at")
    list_filter = ("specialty_area", "status", "submitted_at", "deleted")
    search_fields = ("custom_id", "title", "patient__name", "clinical_question", "clinical_summary", "recommendation")
    autocomplete_fields = ("patient", "consultation", "requested_by", "reviewer")
    ordering = ("-submitted_at",)


@admin.register(ChronicMonitoringProgram)
class ChronicMonitoringProgramAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "condition", "status", "care_manager", "start_date", "next_review_date")
    list_filter = ("condition", "status", "next_review_date", "deleted")
    search_fields = ("custom_id", "patient__name", "care_plan", "escalation_protocol")
    autocomplete_fields = ("patient", "care_manager")
    ordering = ("-start_date",)


@admin.register(RemoteClinicalAlert)
class RemoteClinicalAlertAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "alert_type", "severity", "status", "triggered_at", "acknowledged_at", "resolved_at")
    list_filter = ("alert_type", "severity", "status", "triggered_at", "deleted")
    search_fields = ("custom_id", "patient__name", "message", "recommended_action", "action_taken")
    autocomplete_fields = ("patient", "program", "reading", "device", "acknowledged_by", "resolved_by")
    ordering = ("-triggered_at",)
