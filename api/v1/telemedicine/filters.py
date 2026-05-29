from api.core.filters import SafeFilterSet
from apps.telemedicine.models import (
    ChronicMonitoringProgram,
    RemoteClinicalAlert,
    RemoteMonitoringDevice,
    RemoteVitalReading,
    StoreAndForwardCase,
    TelemedicineWaitingRoomEntry,
)

BASE_FIELDS = [
    "tenant",
    "custom_id",
    "deleted",
    "deleted_at",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
]


class TelemedicineWaitingRoomEntryFilter(SafeFilterSet):
    class Meta:
        model = TelemedicineWaitingRoomEntry
        fields = [
            *BASE_FIELDS,
            "consultation",
            "patient",
            "clinician",
            "status",
            "priority",
            "queue_position",
            "check_in_at",
            "estimated_start_at",
            "device_check_passed",
            "consent_confirmed",
        ]


class RemoteMonitoringDeviceFilter(SafeFilterSet):
    class Meta:
        model = RemoteMonitoringDevice
        fields = [
            *BASE_FIELDS,
            "patient",
            "device_type",
            "status",
            "serial_number",
            "external_device_id",
            "paired_at",
            "last_sync_at",
        ]


class RemoteVitalReadingFilter(SafeFilterSet):
    class Meta:
        model = RemoteVitalReading
        fields = [
            *BASE_FIELDS,
            "patient",
            "device",
            "measured_at",
            "received_at",
            "source",
        ]


class StoreAndForwardCaseFilter(SafeFilterSet):
    class Meta:
        model = StoreAndForwardCase
        fields = [
            *BASE_FIELDS,
            "patient",
            "consultation",
            "requested_by",
            "reviewer",
            "specialty_area",
            "status",
            "submitted_at",
            "reviewed_at",
        ]


class ChronicMonitoringProgramFilter(SafeFilterSet):
    class Meta:
        model = ChronicMonitoringProgram
        fields = [
            *BASE_FIELDS,
            "patient",
            "care_manager",
            "condition",
            "status",
            "start_date",
            "end_date",
            "next_review_date",
        ]


class RemoteClinicalAlertFilter(SafeFilterSet):
    class Meta:
        model = RemoteClinicalAlert
        fields = [
            *BASE_FIELDS,
            "patient",
            "program",
            "reading",
            "device",
            "alert_type",
            "severity",
            "status",
            "triggered_at",
            "acknowledged_at",
            "resolved_at",
            "acknowledged_by",
            "resolved_by",
        ]


FILTER_MAP = {
    "waiting_room": TelemedicineWaitingRoomEntryFilter,
    "device": RemoteMonitoringDeviceFilter,
    "vital_reading": RemoteVitalReadingFilter,
    "async_case": StoreAndForwardCaseFilter,
    "program": ChronicMonitoringProgramFilter,
    "alert": RemoteClinicalAlertFilter,
}
