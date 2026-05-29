from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.radiology.models import (
    ImagingEquipment,
    ImagingFile,
    ImagingProtocol,
    ImagingReport,
    ImagingSeries,
    ImagingStudy,
    PacsIntegrationEvent,
)

from .filters import (
    ImagingEquipmentFilter,
    ImagingFileFilter,
    ImagingProtocolFilter,
    ImagingReportFilter,
    ImagingSeriesFilter,
    ImagingStudyFilter,
    PacsIntegrationEventFilter,
)
from .serializers import (
    ImagingEquipmentSerializer,
    ImagingFileSerializer,
    ImagingProtocolSerializer,
    ImagingReportSerializer,
    ImagingSeriesSerializer,
    ImagingStudySerializer,
    PacsIntegrationEventSerializer,
)


class RadiologyModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class ImagingEquipmentViewSet(RadiologyModelViewSet):
    queryset = ImagingEquipment.objects.all()
    serializer_class = ImagingEquipmentSerializer
    filterset_class = ImagingEquipmentFilter
    search_fields = ["custom_id", "code", "name", "manufacturer", "model", "serial_number", "ae_title", "station_name", "location"]
    ordering = ["name", "code"]


class ImagingProtocolViewSet(RadiologyModelViewSet):
    queryset = ImagingProtocol.objects.all()
    serializer_class = ImagingProtocolSerializer
    filterset_class = ImagingProtocolFilter
    search_fields = ["custom_id", "code", "name", "preparation", "acquisition_instructions", "default_report_template"]
    ordering = ["modality", "name"]


class ImagingStudyViewSet(RadiologyModelViewSet):
    queryset = ImagingStudy.objects.select_related(
        "patient",
        "requesting_doctor",
        "radiologist",
        "consultation",
        "medical_record",
        "prescription_item",
        "protocol",
        "equipment",
    ).prefetch_related("series", "files", "reports")
    serializer_class = ImagingStudySerializer
    filterset_class = ImagingStudyFilter
    search_fields = [
        "custom_id",
        "accession_number",
        "study_instance_uid",
        "patient__name",
        "patient__document_number",
        "protocol__name",
        "equipment__name",
        "clinical_indication",
        "storage_uri",
    ]
    ordering = ["-requested_at", "-created_at"]


class ImagingSeriesViewSet(RadiologyModelViewSet):
    queryset = ImagingSeries.objects.select_related("study", "study__patient").all()
    serializer_class = ImagingSeriesSerializer
    filterset_class = ImagingSeriesFilter
    search_fields = ["custom_id", "study__accession_number", "study__patient__name", "series_instance_uid", "description", "storage_uri"]
    ordering = ["study", "series_number", "id"]


class ImagingFileViewSet(RadiologyModelViewSet):
    queryset = ImagingFile.objects.select_related("study", "study__patient", "series").all()
    serializer_class = ImagingFileSerializer
    filterset_class = ImagingFileFilter
    search_fields = ["custom_id", "study__accession_number", "series__series_instance_uid", "sop_instance_uid", "pacs_object_uri", "checksum"]
    ordering = ["study", "series", "image_number", "id"]


class ImagingReportViewSet(RadiologyModelViewSet):
    queryset = ImagingReport.objects.select_related("study", "study__patient", "radiologist").all()
    serializer_class = ImagingReportSerializer
    filterset_class = ImagingReportFilter
    search_fields = ["custom_id", "study__accession_number", "study__patient__name", "radiologist__name", "findings", "impression", "recommendations"]
    ordering = ["-reported_at", "-created_at"]


class PacsIntegrationEventViewSet(RadiologyModelViewSet):
    queryset = PacsIntegrationEvent.objects.select_related("study", "study__patient", "equipment").all()
    serializer_class = PacsIntegrationEventSerializer
    filterset_class = PacsIntegrationEventFilter
    search_fields = ["custom_id", "study__accession_number", "accession_number", "study_instance_uid", "message_control_id", "error_message"]
    ordering = ["-event_at", "-created_at"]


VIEWSET_MAP = {
    "equipment": ImagingEquipmentViewSet,
    "protocol": ImagingProtocolViewSet,
    "study": ImagingStudyViewSet,
    "series": ImagingSeriesViewSet,
    "file": ImagingFileViewSet,
    "report": ImagingReportViewSet,
    "pacs_event": PacsIntegrationEventViewSet,
}
