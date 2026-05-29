from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.telemedicine.models import (
    ChronicMonitoringProgram,
    RemoteClinicalAlert,
    RemoteMonitoringDevice,
    RemoteVitalReading,
    StoreAndForwardCase,
    TelemedicineWaitingRoomEntry,
)

from .filters import (
    ChronicMonitoringProgramFilter,
    RemoteClinicalAlertFilter,
    RemoteMonitoringDeviceFilter,
    RemoteVitalReadingFilter,
    StoreAndForwardCaseFilter,
    TelemedicineWaitingRoomEntryFilter,
)
from .serializers import (
    ChronicMonitoringProgramSerializer,
    RemoteClinicalAlertSerializer,
    RemoteMonitoringDeviceSerializer,
    RemoteVitalReadingSerializer,
    StoreAndForwardCaseSerializer,
    TelemedicineWaitingRoomEntrySerializer,
)


class TelemedicineModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class TelemedicineWaitingRoomEntryViewSet(TelemedicineModelViewSet):
    queryset = TelemedicineWaitingRoomEntry.objects.select_related("consultation", "patient", "clinician").all()
    serializer_class = TelemedicineWaitingRoomEntrySerializer
    filterset_class = TelemedicineWaitingRoomEntryFilter
    search_fields = ["custom_id", "patient__name", "consultation__custom_id", "chief_complaint", "preliminary_symptoms", "triage_notes"]
    ordering = ["queue_position", "check_in_at"]


class RemoteMonitoringDeviceViewSet(TelemedicineModelViewSet):
    queryset = RemoteMonitoringDevice.objects.select_related("patient").prefetch_related("readings")
    serializer_class = RemoteMonitoringDeviceSerializer
    filterset_class = RemoteMonitoringDeviceFilter
    search_fields = ["custom_id", "patient__name", "serial_number", "external_device_id", "manufacturer", "model_name"]
    ordering = ["patient", "device_type", "-last_sync_at"]


class RemoteVitalReadingViewSet(TelemedicineModelViewSet):
    queryset = RemoteVitalReading.objects.select_related("patient", "device").all()
    serializer_class = RemoteVitalReadingSerializer
    filterset_class = RemoteVitalReadingFilter
    search_fields = ["custom_id", "patient__name", "device__serial_number", "device__external_device_id", "notes"]
    ordering = ["-measured_at", "-created_at"]


class StoreAndForwardCaseViewSet(TelemedicineModelViewSet):
    queryset = StoreAndForwardCase.objects.select_related("patient", "consultation", "requested_by", "reviewer").all()
    serializer_class = StoreAndForwardCaseSerializer
    filterset_class = StoreAndForwardCaseFilter
    search_fields = ["custom_id", "title", "patient__name", "clinical_question", "clinical_summary", "findings", "recommendation"]
    ordering = ["-submitted_at", "-created_at"]


class ChronicMonitoringProgramViewSet(TelemedicineModelViewSet):
    queryset = ChronicMonitoringProgram.objects.select_related("patient", "care_manager").prefetch_related("alerts")
    serializer_class = ChronicMonitoringProgramSerializer
    filterset_class = ChronicMonitoringProgramFilter
    search_fields = ["custom_id", "patient__name", "care_plan", "escalation_protocol", "notes"]
    ordering = ["-start_date", "-created_at"]


class RemoteClinicalAlertViewSet(TelemedicineModelViewSet):
    queryset = RemoteClinicalAlert.objects.select_related(
        "patient",
        "program",
        "reading",
        "device",
        "acknowledged_by",
        "resolved_by",
    ).all()
    serializer_class = RemoteClinicalAlertSerializer
    filterset_class = RemoteClinicalAlertFilter
    search_fields = ["custom_id", "patient__name", "message", "recommended_action", "action_taken", "notes"]
    ordering = ["-triggered_at", "-created_at"]


VIEWSET_MAP = {
    "waiting_room": TelemedicineWaitingRoomEntryViewSet,
    "device": RemoteMonitoringDeviceViewSet,
    "vital_reading": RemoteVitalReadingViewSet,
    "async_case": StoreAndForwardCaseViewSet,
    "program": ChronicMonitoringProgramViewSet,
    "alert": RemoteClinicalAlertViewSet,
}
