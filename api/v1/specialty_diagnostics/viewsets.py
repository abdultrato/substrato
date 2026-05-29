from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.specialty_diagnostics.models import (
    SpecialtyDiagnosticEquipment,
    SpecialtyDiagnosticIntegrationEvent,
    SpecialtyDiagnosticMeasurement,
    SpecialtyDiagnosticOrder,
    SpecialtyDiagnosticProtocol,
    SpecialtyDiagnosticReport,
)

from .filters import (
    SpecialtyDiagnosticEquipmentFilter,
    SpecialtyDiagnosticIntegrationEventFilter,
    SpecialtyDiagnosticMeasurementFilter,
    SpecialtyDiagnosticOrderFilter,
    SpecialtyDiagnosticProtocolFilter,
    SpecialtyDiagnosticReportFilter,
)
from .serializers import (
    SpecialtyDiagnosticEquipmentSerializer,
    SpecialtyDiagnosticIntegrationEventSerializer,
    SpecialtyDiagnosticMeasurementSerializer,
    SpecialtyDiagnosticOrderSerializer,
    SpecialtyDiagnosticProtocolSerializer,
    SpecialtyDiagnosticReportSerializer,
)


class SpecialtyDiagnosticsModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class SpecialtyDiagnosticEquipmentViewSet(SpecialtyDiagnosticsModelViewSet):
    queryset = SpecialtyDiagnosticEquipment.objects.all()
    serializer_class = SpecialtyDiagnosticEquipmentSerializer
    filterset_class = SpecialtyDiagnosticEquipmentFilter
    search_fields = ["custom_id", "code", "name", "manufacturer", "model", "serial_number", "station_name", "location"]
    ordering = ["specialty", "name", "code"]


class SpecialtyDiagnosticProtocolViewSet(SpecialtyDiagnosticsModelViewSet):
    queryset = SpecialtyDiagnosticProtocol.objects.all()
    serializer_class = SpecialtyDiagnosticProtocolSerializer
    filterset_class = SpecialtyDiagnosticProtocolFilter
    search_fields = ["custom_id", "code", "name", "preparation", "acquisition_instructions", "default_report_template"]
    ordering = ["specialty", "modality", "name"]


class SpecialtyDiagnosticOrderViewSet(SpecialtyDiagnosticsModelViewSet):
    queryset = SpecialtyDiagnosticOrder.objects.select_related(
        "patient",
        "requesting_doctor",
        "specialist",
        "consultation",
        "medical_record",
        "prescription_item",
        "protocol",
        "equipment",
    ).prefetch_related("measurements", "reports", "integration_events")
    serializer_class = SpecialtyDiagnosticOrderSerializer
    filterset_class = SpecialtyDiagnosticOrderFilter
    search_fields = [
        "custom_id",
        "order_number",
        "external_order_id",
        "patient__name",
        "patient__document_number",
        "protocol__name",
        "equipment__name",
        "clinical_indication",
    ]
    ordering = ["-requested_at", "-created_at"]


class SpecialtyDiagnosticMeasurementViewSet(SpecialtyDiagnosticsModelViewSet):
    queryset = SpecialtyDiagnosticMeasurement.objects.select_related("order", "order__patient").all()
    serializer_class = SpecialtyDiagnosticMeasurementSerializer
    filterset_class = SpecialtyDiagnosticMeasurementFilter
    search_fields = ["custom_id", "code", "name", "order__order_number", "order__patient__name", "text_value", "interpretation"]
    ordering = ["order", "position", "id"]


class SpecialtyDiagnosticReportViewSet(SpecialtyDiagnosticsModelViewSet):
    queryset = SpecialtyDiagnosticReport.objects.select_related("order", "order__patient", "specialist").all()
    serializer_class = SpecialtyDiagnosticReportSerializer
    filterset_class = SpecialtyDiagnosticReportFilter
    search_fields = ["custom_id", "order__order_number", "order__patient__name", "specialist__name", "findings", "impression", "recommendations"]
    ordering = ["-reported_at", "-created_at"]


class SpecialtyDiagnosticIntegrationEventViewSet(SpecialtyDiagnosticsModelViewSet):
    queryset = SpecialtyDiagnosticIntegrationEvent.objects.select_related("order", "order__patient", "equipment").all()
    serializer_class = SpecialtyDiagnosticIntegrationEventSerializer
    filterset_class = SpecialtyDiagnosticIntegrationEventFilter
    search_fields = ["custom_id", "order__order_number", "external_order_id", "message_control_id", "error_message"]
    ordering = ["-event_at", "-created_at"]


VIEWSET_MAP = {
    "equipment": SpecialtyDiagnosticEquipmentViewSet,
    "protocol": SpecialtyDiagnosticProtocolViewSet,
    "order": SpecialtyDiagnosticOrderViewSet,
    "measurement": SpecialtyDiagnosticMeasurementViewSet,
    "report": SpecialtyDiagnosticReportViewSet,
    "integration_event": SpecialtyDiagnosticIntegrationEventViewSet,
}
