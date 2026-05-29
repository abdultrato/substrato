from api.core.filters import SafeFilterSet
from apps.radiology.models import (
    ImagingEquipment,
    ImagingFile,
    ImagingProtocol,
    ImagingReport,
    ImagingSeries,
    ImagingStudy,
    PacsIntegrationEvent,
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


class ImagingEquipmentFilter(SafeFilterSet):
    class Meta:
        model = ImagingEquipment
        fields = [*BASE_FIELDS, "code", "modality", "status", "ae_title", "next_quality_control"]


class ImagingProtocolFilter(SafeFilterSet):
    class Meta:
        model = ImagingProtocol
        fields = [*BASE_FIELDS, "code", "modality", "body_region", "contrast_required"]


class ImagingStudyFilter(SafeFilterSet):
    class Meta:
        model = ImagingStudy
        fields = [
            *BASE_FIELDS,
            "patient",
            "requesting_doctor",
            "radiologist",
            "consultation",
            "medical_record",
            "prescription_item",
            "protocol",
            "equipment",
            "accession_number",
            "study_instance_uid",
            "modality",
            "body_region",
            "status",
            "priority",
            "requested_at",
            "scheduled_at",
            "images_available",
        ]


class ImagingSeriesFilter(SafeFilterSet):
    class Meta:
        model = ImagingSeries
        fields = [*BASE_FIELDS, "study", "series_instance_uid", "series_number", "modality", "body_region"]


class ImagingFileFilter(SafeFilterSet):
    class Meta:
        model = ImagingFile
        fields = [*BASE_FIELDS, "study", "series", "file_type", "sop_instance_uid", "image_number"]


class ImagingReportFilter(SafeFilterSet):
    class Meta:
        model = ImagingReport
        fields = [*BASE_FIELDS, "study", "radiologist", "status", "version_number", "reported_at", "signed_at", "critical_result"]


class PacsIntegrationEventFilter(SafeFilterSet):
    class Meta:
        model = PacsIntegrationEvent
        fields = [
            *BASE_FIELDS,
            "study",
            "equipment",
            "event_type",
            "direction",
            "status",
            "external_system",
            "accession_number",
            "study_instance_uid",
            "message_control_id",
            "event_at",
        ]


FILTER_MAP = {
    "equipment": ImagingEquipmentFilter,
    "protocol": ImagingProtocolFilter,
    "study": ImagingStudyFilter,
    "series": ImagingSeriesFilter,
    "file": ImagingFileFilter,
    "report": ImagingReportFilter,
    "pacs_event": PacsIntegrationEventFilter,
}
