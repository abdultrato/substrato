import django_filters

from api.core.filters import SafeFilterSet
from apps.specialty_diagnostics.models import (
    SpecialtyDiagnosticEquipment,
    SpecialtyDiagnosticIntegrationEvent,
    SpecialtyDiagnosticMeasurement,
    SpecialtyDiagnosticOrder,
    SpecialtyDiagnosticProtocol,
    SpecialtyDiagnosticReport,
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


class SpecialtyDiagnosticEquipmentFilter(SafeFilterSet):
    class Meta:
        model = SpecialtyDiagnosticEquipment
        fields = [*BASE_FIELDS, "code", "specialty", "modality", "status", "serial_number", "next_quality_control"]


class SpecialtyDiagnosticProtocolFilter(SafeFilterSet):
    class Meta:
        model = SpecialtyDiagnosticProtocol
        fields = [*BASE_FIELDS, "code", "specialty", "modality"]


class SpecialtyDiagnosticOrderFilter(SafeFilterSet):
    class Meta:
        model = SpecialtyDiagnosticOrder
        fields = [
            *BASE_FIELDS,
            "patient",
            "requesting_doctor",
            "specialist",
            "consultation",
            "medical_record",
            "prescription_item",
            "protocol",
            "equipment",
            "order_number",
            "external_order_id",
            "specialty",
            "modality",
            "status",
            "priority",
            "requested_at",
            "scheduled_at",
            "performed_at",
            "measurements_complete",
            "report_available",
        ]


class SpecialtyDiagnosticMeasurementFilter(SafeFilterSet):
    specialty = django_filters.CharFilter(field_name="order__specialty")
    modality = django_filters.CharFilter(field_name="order__modality")

    class Meta:
        model = SpecialtyDiagnosticMeasurement
        fields = [*BASE_FIELDS, "order", "code", "value_type", "abnormal", "critical", "measured_at"]


class SpecialtyDiagnosticReportFilter(SafeFilterSet):
    specialty = django_filters.CharFilter(field_name="order__specialty")
    modality = django_filters.CharFilter(field_name="order__modality")

    class Meta:
        model = SpecialtyDiagnosticReport
        fields = [*BASE_FIELDS, "order", "specialist", "status", "version_number", "reported_at", "signed_at", "critical_result"]


class SpecialtyDiagnosticIntegrationEventFilter(SafeFilterSet):
    specialty = django_filters.CharFilter(field_name="order__specialty")
    modality = django_filters.CharFilter(field_name="order__modality")

    class Meta:
        model = SpecialtyDiagnosticIntegrationEvent
        fields = [
            *BASE_FIELDS,
            "order",
            "equipment",
            "event_type",
            "direction",
            "status",
            "external_system",
            "order_number",
            "external_order_id",
            "message_control_id",
            "event_at",
        ]


FILTER_MAP = {
    "equipment": SpecialtyDiagnosticEquipmentFilter,
    "protocol": SpecialtyDiagnosticProtocolFilter,
    "order": SpecialtyDiagnosticOrderFilter,
    "measurement": SpecialtyDiagnosticMeasurementFilter,
    "report": SpecialtyDiagnosticReportFilter,
    "integration_event": SpecialtyDiagnosticIntegrationEventFilter,
}
